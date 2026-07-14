using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;

internal static class KandyDropsLauncher
{
    private const string Host = "127.0.0.1";
    private const int Port = 3000;
    private const int StartupTimeoutSeconds = 600;

    private static int Main()
    {
        string repoRoot = FindRepoRoot(AppDomain.CurrentDomain.BaseDirectory);
        if (repoRoot.Length == 0)
        {
            Console.Error.WriteLine("Could not find package.json. Run this launcher from inside the KandyDrops repo.");
            return 1;
        }

        string url = "http://" + Host + ":" + Port.ToString() + "/";
        string command = "npm run build -- --webpack && npm run start -- --hostname " + Host + " --port " + Port.ToString();

        if (IsPortInUse())
        {
            Console.Error.WriteLine("Port " + Port.ToString() + " is already in use. Stop the existing local server, then reopen this launcher.");
            return 1;
        }

        Console.WriteLine("Starting KandyDrops connected local production server.");
        Console.WriteLine("This launcher uses the services configured in .env.local; it is not an offline audit sandbox.");
        Console.WriteLine("Repo: " + repoRoot);
        Console.WriteLine("URL:  " + url);
        Console.WriteLine("Close this window to stop the local server.");

        var startInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/d /s /c \"" + command + "\"",
            WorkingDirectory = repoRoot,
            UseShellExecute = false,
        };
        startInfo.EnvironmentVariables["HOSTNAME"] = Host;
        startInfo.EnvironmentVariables["PORT"] = Port.ToString();
        startInfo.EnvironmentVariables["BROWSER"] = "none";
        startInfo.EnvironmentVariables["NEXT_TELEMETRY_DISABLED"] = "1";
        startInfo.EnvironmentVariables["KANDYDROPS_LOCAL_EXE"] = "connected_live";

        using (var server = Process.Start(startInfo))
        {
            if (server == null)
            {
                Console.Error.WriteLine("Failed to start npm.");
                return 1;
            }

            if (WaitForServerReady(server, TimeSpan.FromSeconds(StartupTimeoutSeconds)))
            {
                OpenBrowser(url);
            }

            server.WaitForExit();
            return server.ExitCode;
        }
    }

    private static string FindRepoRoot(string startDirectory)
    {
        var directory = new DirectoryInfo(startDirectory);
        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "package.json"))
                && File.Exists(Path.Combine(directory.FullName, "next.config.ts")))
            {
                return directory.FullName;
            }
            directory = directory.Parent;
        }
        return "";
    }

    private static bool WaitForServerReady(Process server, TimeSpan timeout)
    {
        DateTime deadline = DateTime.UtcNow.Add(timeout);
        DateTime lastNotice = DateTime.MinValue;
        Console.WriteLine("Waiting for local Next server to finish build and start...");

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                if (server.HasExited)
                {
                    Console.Error.WriteLine("The local server stopped before it was ready.");
                    return false;
                }

                var request = (HttpWebRequest)WebRequest.Create(
                    "http://" + Host + ":" + Port.ToString() + "/api/health"
                );
                request.Method = "GET";
                request.Proxy = null;
                request.Timeout = 2000;
                request.ReadWriteTimeout = 2000;

                using (var response = (HttpWebResponse)request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    string body = reader.ReadToEnd();
                    if (response.StatusCode == HttpStatusCode.OK
                        && body.IndexOf("\"status\":\"healthy\"", StringComparison.Ordinal) >= 0)
                    {
                        Console.WriteLine("KandyDrops local server is healthy.");
                        return true;
                    }
                }
            }
            catch
            {
                // The server is still building or starting.
            }

            if ((DateTime.UtcNow - lastNotice).TotalSeconds >= 15)
            {
                Console.WriteLine("Still waiting for the local server...");
                lastNotice = DateTime.UtcNow;
            }

            Thread.Sleep(TimeSpan.FromSeconds(1));
        }

        Console.Error.WriteLine("Timed out waiting for the local server. Open the URL above manually if it finishes later.");
        return false;
    }

    private static bool IsPortInUse()
    {
        try
        {
            using (var client = new TcpClient())
            {
                IAsyncResult result = client.BeginConnect(Host, Port, null, null);
                bool connected = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(500));
                if (!connected)
                {
                    return false;
                }

                client.EndConnect(result);
                return true;
            }
        }
        catch
        {
            return false;
        }
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true,
            });
        }
        catch
        {
            Console.WriteLine("Open the URL above once the server finishes starting.");
        }
    }
}
