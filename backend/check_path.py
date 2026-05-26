import json
from filesystem.location_checker import LocationChecker

def run_resolver():
    """
    EDITH Location Resolver Utility
    Takes a folder name from intent detection and resolves it as a full path.
    """
    checker = LocationChecker()
    
    print("EDITH System: Location Resolver Interface")
    print("==========================================")
    
    # Get user input (simulating intent detection output)
    user_path = input("Folder name from the intent detection > ")

    # Check and resolve path using EDITH's smart resolution
    result = checker.check_path(user_path)

    # Print formatted result
    print("\nResult:")
    print(json.dumps(result, indent=4))

if __name__ == "__main__":
    run_resolver()
