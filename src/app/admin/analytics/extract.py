import os

page_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\page.tsx"
with open(page_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_content_between(start_str, end_str):
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if start_str in line and start_idx == -1:
            start_idx = i
        if end_str in line and start_idx != -1 and i > start_idx + 1:
            end_idx = i
            break
    if start_idx != -1 and end_idx != -1:
        return lines[start_idx:end_idx+1], start_idx, end_idx
    return [], -1, -1

# Find operations
ops_jsx, o_s, o_e = get_content_between('{activeTab === "operations" ? (', '{activeTab === "audience" ? (')

# Find audience
aud_jsx, a_s, a_e = get_content_between('{activeTab === "audience" ? (', '{activeTab === "commerce" ? (')

# Find commerce
com_jsx, c_s, c_e = get_content_between('{activeTab === "commerce" ? (', '</main>')

print("Operations: ", o_s, o_e, len(ops_jsx))
print("Audience: ", a_s, a_e, len(aud_jsx))
print("Commerce: ", c_s, c_e, len(com_jsx))

# Now write them to separate files, properly wrapped
ops_imports = """import { useMemo } from "react";
import { Activity, AlertTriangle, PlayCircle, Share2, ShoppingBag, Sparkles, Users, Wallet, Eye, CheckCircle2, Clock3, Monitor, Smartphone, Check } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart } from "recharts";
import { AnalyticsTooltip, MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminOnboardingAnalyticsModules } from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
"""

with open("operations_temp.jsx", "w", encoding="utf-8") as f:
    f.writelines(ops_jsx[:-1]) # exclude the audience check

with open("audience_temp.jsx", "w", encoding="utf-8") as f:
    f.writelines(aud_jsx[:-1])

with open("commerce_temp.jsx", "w", encoding="utf-8") as f:
    f.writelines(com_jsx[:-1])

