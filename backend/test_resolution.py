from filesystem.utils import normalize_path
import os

test_paths = [
    "Desktop",
    "Documents",
    "Manuel2995",
    "C:/Users",
    "~/Desktop",
    "Assignment"
]

print(f"CWD: {os.getcwd()}")
for p in test_paths:
    resolved = normalize_path(p)
    print(f"Input: {p:15} | Resolved: {resolved} | Exists: {resolved.exists()}")
