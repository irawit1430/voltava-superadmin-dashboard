import re

files_and_replacements = [
    ('src/pages/Dashboard.tsx', [
        ('text-slate-800 font-medium flex items-center gap-2"', 'text-slate-800 font-medium flex items-center gap-2 truncate max-w-[150px]"'),
    ]),
    ('src/pages/Schools.tsx', [
        ('text-slate-800 font-medium flex items-center gap-3"', 'text-slate-800 font-medium flex items-center gap-3 truncate max-w-[150px]"'),
        ('text-sm text-slate-600"', 'text-sm text-slate-600 truncate max-w-[150px]"'),
    ]),
    ('src/pages/Admins.tsx', [
        ('font-medium text-slate-900 text-sm"', 'font-medium text-slate-900 text-sm truncate max-w-[150px]"'),
        ('text-sm text-slate-600"', 'text-sm text-slate-600 truncate max-w-[150px]"'),
    ]),
    ('src/pages/Devices.tsx', [
        ('font-mono text-emerald-600 font-medium text-xs flex items-center gap-2"', 'font-mono text-emerald-600 font-medium text-xs flex items-center gap-2 truncate max-w-[150px]"'),
        ('font-mono text-slate-600 text-xs"', 'font-mono text-slate-600 text-xs truncate max-w-[150px]"'),
        ('text-slate-800 font-medium"', 'text-slate-800 font-medium truncate max-w-[150px]"'),
    ]),
    ('src/pages/SchoolProfile.tsx', [
        ('font-mono text-emerald-600 font-medium text-xs"', 'font-mono text-emerald-600 font-medium text-xs truncate max-w-[150px]"'),
        ('font-mono text-slate-600 text-xs"', 'font-mono text-slate-600 text-xs truncate max-w-[150px]"'),
        ('text-slate-600"', 'text-slate-600 truncate max-w-[150px]"'),
    ]),
]

for file, replacements in files_and_replacements:
    with open(file, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(file, 'w') as f:
        f.write(content)
    print(f"Updated {file}")
