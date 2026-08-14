import os
import re

files_to_update = [
    'src/pages/Devices.tsx',
    'src/pages/Schools.tsx',
    'src/pages/Admins.tsx',
    'src/pages/Dashboard.tsx',
    'src/pages/SchoolProfile.tsx'
]

for file in files_to_update:
    if not os.path.exists(file):
        print(f"{file} does not exist!")
        continue

    with open(file, 'r') as f:
        content = f.read()

    # Wrap tables in overflow-x-auto min-w-full
    content = content.replace('className="overflow-x-auto flex-1"', 'className="overflow-x-auto min-w-full flex-1"')

    # Also in some places it might just be <div className="overflow-x-auto">
    # Dashboard has <div className="overflow-x-auto flex-1"> already.
    # What about padding? Change px-6 py-3 and px-4 py-3 to px-2 py-2 sm:px-4 sm:py-3
    content = re.sub(r'px-6 py-3', 'px-2 py-2 sm:px-4 sm:py-3', content)
    content = re.sub(r'px-4 py-3', 'px-2 py-2 sm:px-4 sm:py-3', content)

    # Let's add truncate to td's that have text
    # Finding elements with td and specific strings or we can just append truncate max-w-[150px] to specific classes.
    # It's safer to just add truncate max-w-[150px] to font-mono or font-medium text-xs elements inside td.

    with open(file, 'w') as f:
        f.write(content)

    print(f"Updated {file}")
