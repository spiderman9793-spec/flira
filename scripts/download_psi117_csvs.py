import urllib.request, urllib.parse, os, json, csv

out_dir = r"c:\Users\adars\Downloads\flame-in-freefall (1)\flame-in-freefall-v2\src\data\psi_117_data"
os.makedirs(out_dir, exist_ok=True)

files = [
    "PSI-117_Analyzed Data_PROCI_2023_Alkane_Extinction_Diameter_1atm.csv",
    "PSI-117_Analyzed Data_PROCI_2019_Oscillatory_Cool_Flame.csv",
    "PSI-117_Analyzed Data_PROCI_2023_C12_Extinction_Diameter_vs_pressure.csv",
    "PSI-117_Analyzed Data_PROCI_2019_Stable_Cool.csv",
    "PSI-117_Analyzed Data_PROCI_C12_2019_Three_Stage.csv",
    "PSI-117_Analyzed Data_MST_2024_Burning_history_Flame_diameter.csv",
    "PSI-117_Analyzed Data_MST_2024_Kavg.csv",
    "PSI-117_Analyzed Data_MST_2024_Dext.csv",
    "PSI-117_Analyzed Data_MST_2024_Radiance_Flame_Diameter.csv"
]

downloaded = []
for fn in files:
    url = f"https://psi.nasa.gov/geode-py/ws/studies/PSI-117/download?file={urllib.parse.quote(fn)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        dest = os.path.join(out_dir, fn)
        with urllib.request.urlopen(req, timeout=15) as r:
            content = r.read()
            with open(dest, "wb") as f_out:
                f_out.write(content)
            downloaded.append((fn, len(content)))
            print(f"Downloaded: {fn} ({len(content)} bytes)")
    except Exception as e:
        print(f"Failed {fn}: {e}")

print(f"Total downloaded: {len(downloaded)} / {len(files)}")
