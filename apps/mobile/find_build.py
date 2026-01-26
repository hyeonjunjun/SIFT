import json
import sys

try:
    with open('builds.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for build in data:
            if str(build.get('buildNumber')) == '53':
                print(f"FOUND_BUILD_ID:{build.get('id')}")
                sys.exit(0)
    print("BUILD_NOT_FOUND")
except Exception as e:
    print(f"ERROR:{e}")
