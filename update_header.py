import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# Add Menu import if not there
if 'Menu' not in content:
    content = content.replace("import { Bell,", "import { Bell, Menu,")

# Update props to accept onMenuClick
content = content.replace("export function Header() {", "export function Header({ onMenuClick }: { onMenuClick: () => void }) {")

# Update header class for mobile responsiveness and add Menu button
new_header_start = """<header className="h-auto sm:h-16 py-4 sm:py-0 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 lg:ml-64 shrink-0 relative z-40 gap-4 sm:gap-0">
      <div className="flex items-center w-full max-w-xl gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center w-full max-w-xl" ref={searchRef}>"""

content = re.sub(
    r'<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 ml-64 shrink-0 relative z-50">\n\s*<div className="flex items-center w-full max-w-xl" ref=\{searchRef\}>',
    new_header_start,
    content
)

# Update right section to match layout if needed, it should flex correctly now.
# However, the right section might need width full on mobile or wrap. Let's make sure right side is right aligned.
# Currently it is: <div className="flex items-center gap-6">
# Let's adjust it so it wraps or aligns properly.
content = content.replace(
    '<div className="flex items-center gap-6">',
    '<div className="flex items-center justify-end w-full sm:w-auto gap-4 sm:gap-6">'
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

print("Updated Header.tsx")
