import os
import subprocess
import sys
from pathlib import Path

tests_dir = Path(__file__).parent
test_files = [f for f in tests_dir.glob("test_*.py") if f.name != "run_all.py"]

print(f"Discovered {len(test_files)} test files to run.")
print("====================================================")

failed = 0
passed = 0

for test_file in test_files:
    print(f"\nRunning test file: {test_file.name}")
    print("-" * 40)
    
    # Run test file as subprocess with PYTHONPATH set to the backend directory
    env = os.environ.copy()
    env["PYTHONPATH"] = str(tests_dir.parent)
    res = subprocess.run([sys.executable, str(test_file)], capture_output=True, text=True, cwd=str(tests_dir.parent), env=env)
    
    if res.returncode == 0:
        print(f"PASSED: {test_file.name}")
        passed += 1
    else:
        print(f"FAILED: {test_file.name} (exit code {res.returncode})")
        print("STDOUT:")
        print(res.stdout)
        print("STDERR:")
        print(res.stderr)
        failed += 1

print("\n====================================================")
print(f"TEST RESULTS: {passed} passed, {failed} failed out of {len(test_files)}")
if failed > 0:
    sys.exit(1)
