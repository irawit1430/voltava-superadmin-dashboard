import re

with open('src/pages/Devices.tsx', 'r') as f:
    content = f.read()

content = content.replace("value={search}", "value={searchQuery}")
content = content.replace("setSearch(e.target.value)", "setSearchQuery(e.target.value)")
content = content.replace("setSearch('')", "setSearchQuery('')")

with open('src/pages/Devices.tsx', 'w') as f:
    f.write(content)
