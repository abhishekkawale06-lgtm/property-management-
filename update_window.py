import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "window.open('demo_aadhaar.webp', '_blank')",
    "window.open('demo_aadhaar.webp', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no')"
)

content = content.replace(
    "window.open('demo_pan.jpg', '_blank')",
    "window.open('demo_pan.jpg', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no')"
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated window.open calls")
