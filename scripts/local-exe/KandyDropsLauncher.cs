using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

internal static class KandyDropsLauncher
{
    private const string Host = "127.0.0.1";
    private const int Port = 3000;
    private const int StartupTimeoutSeconds = 600;

    private static int Main()
    {
        string exeName = Path.GetFileNameWithoutExtension(Environment.GetCommandLineArgs()[0]) ?? "";
        bool testMode = exeName.IndexOf("test", StringComparison.OrdinalIgnoreCase) >= 0;
        string repoRoot = FindRepoRoot(AppDomain.CurrentDomain.BaseDirectory);
        if (repoRoot.Length == 0)
        {
            Console.Error.WriteLine("Could not find package.json. Run this launcher from inside the KandyDrops repo.");
            return 1;
        }

        string url = testMode
            ? "http://" + Host + ":" + Port.ToString() + "/api/admin-ui-test-session?redirect=/admin"
            : "http://" + Host + ":" + Port.ToString() + "/";
        string command = "npm run build && npm run start -- --hostname " + Host + " --port " + Port.ToString();

        Console.WriteLine(testMode
            ? "Starting KandyDrops local production test server with admin fixture access."
            : "Starting KandyDrops connected local production server.");
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
        startInfo.EnvironmentVariables["KANDYDROPS_LOCAL_EXE"] = testMode ? "test" : "connected_live";
        if (testMode)
        {
            startInfo.EnvironmentVariables["NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION"] = "1";
        }

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

                using (var client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(Host, Port, null, null);
                    bool connected = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(500));
                    if (connected)
                    {
                        client.EndConnect(result);
                        Console.WriteLine("Local server is ready.");
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
