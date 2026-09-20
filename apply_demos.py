import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Profile view
content = content.replace(
    "showToast('Viewing Aadhaar Document...'); return false;",
    "window.open('demo_aadhaar.webp', '_blank'); return false;"
)
content = content.replace(
    "showToast('Viewing PAN Document...'); return false;",
    "window.open('demo_pan.jpg', '_blank'); return false;"
)

# In the Edit modal, there are two instances of "showToast('Viewing Document...')".
# We can find them by looking at the input context.

aadhaar_target = """<input type="file" name="aadhaarDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Viewing Document...')" style="padding: 4px 8px; font-size: 11px;">View</button>"""
aadhaar_replacement = """<input type="file" name="aadhaarDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.open('demo_aadhaar.webp', '_blank')" style="padding: 4px 8px; font-size: 11px;">View</button>"""

pan_target = """<input type="file" name="panDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Viewing Document...')" style="padding: 4px 8px; font-size: 11px;">View</button>"""
pan_replacement = """<input type="file" name="panDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.open('demo_pan.jpg', '_blank')" style="padding: 4px 8px; font-size: 11px;">View</button>"""

content = content.replace(aadhaar_target, aadhaar_replacement)
content = content.replace(pan_target, pan_replacement)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated links")
