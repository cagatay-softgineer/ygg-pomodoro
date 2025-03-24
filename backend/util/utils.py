import os
from cmd_gui_kit import CmdGUI
from datetime import datetime
import hashlib
import pandas as pd
from config.config import settings
from util.logit import get_logger

OAUTHLIB_INSECURE_TRANSPORT=1

# Initialize CmdGUI for visual feedback
gui = CmdGUI()

# Logging setup
logger = get_logger("logs/utils.log", "Utils")



def obfuscate(column_name: str) -> str:
    """
    Obfuscates a given column name by hashing it with a salt value and returning the first 12 characters in uppercase.

    Parameters:
    column_name (str): The column name to be obfuscated.

    Returns:
    str: The obfuscated column name, consisting of the first 12 characters of the hashed value in uppercase.
    """
    salt = settings.salt  # Replace with your own secret salt value.
    hash_value = hashlib.sha256((salt + column_name).encode('utf-8')).hexdigest()
    return f"{hash_value[:12].upper()}"


def get_email_username(email: str) -> str | None:
    """
    Extracts and returns the part of an email address before the '@' symbol.

    Parameters:
        email (str): The email address.

    Returns:
        str: The part of the email before the '@'. Returns None if '@' is not found.
    """
    if "@" in email:
        return email.split("@")[0]
    else:
        return None


    
route_descriptions = {
    "/.well-known/assetlinks.json": "Provides asset links for verifying app association with a domain.",
    "/api/docs/": "Swagger UI documentation root for API endpoints.",
    "/api/docs/<path:path>": "Serves specific Swagger UI documentation files based on the given path.",
    "/api/docs/dist/<path:filename>": "Static assets for the Swagger UI, such as JavaScript and CSS files.",
    "/apps/check_linked_app": "Checks if a specific app is linked to the current user or account.",
    "/apps/healthcheck": "Health check endpoint for the apps service to verify it's running correctly.",
    "/apps/unlink_app": "Unlinks a previously linked app from the current user or account.",
    "/auth/healthcheck": "Health check endpoint for the authentication service to verify functionality.",
    "/auth/login": "Handles user login requests with necessary credentials.",
    "/auth/register": "Handles user registration by creating a new account.",
    "/endpoints": "Lists all available endpoints in the application.",
    "/error_stats": "Displays error statistics for the application, such as error logs or counts.",
    "/healthcheck": "General health check endpoint for the main application.",
    "/profile/healthcheck": "Health check endpoint for the profile service to ensure it's operational.",
    "/profile/view": "Displays the profile of the current user.",
    "/spotify-micro-service/healthcheck": "Health check endpoint for the Spotify microservice.",
    "/spotify-micro-service/playlist_duration": "Calculates the total duration of a playlist using the Spotify microservice.",
    "/spotify/callback": "Callback endpoint for Spotify's OAuth process to handle token redirection.",
    "/spotify/healthcheck": "Health check endpoint for the Spotify service integration.",
    "/spotify/login/<user_id>": "Logs in a specific Spotify user by their user ID.",
    "/spotify/playlists": "Retrieves playlists associated with the logged-in Spotify user.",
    "/spotify/token": "Handles token requests for Spotify API authentication.",
    "/spotify/user_profile": "Retrieves profile information of the logged-in Spotify user."
}

def parse_logs_from_folder(folder_path: str) -> list[dict] | None:
    """
    Parses log files from a specified folder and returns a list of parsed log data.

    Parameters:
    folder_path (str): The path to the folder containing log files.

    Returns:
    list[dict] | None: A list of dictionaries, where each dictionary represents a parsed log.
    If the folder does not exist or contains no log files, returns None.

    Each dictionary in the list contains the following keys:
    - "filename" (str): The name of the log file.
    - "timestamp" (datetime): The timestamp of the log entry.
    - "log_type" (str): The type of the log entry (e.g., INFO, DEBUG, WARN, ERROR).
    - "message" (str): The content of the log entry.
    """
    logs = []
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path) and filename.endswith('.log'):  # Assuming log files are .txt
            with open(file_path, 'r') as file:
                for line in file:
                    try:
                        parts = line.split(" - ")
                        timestamp = parts[0].strip()
                        log_type = parts[2].strip()
                        message = " - ".join(parts[3:]).strip()

                        # Append parsed log data
                        logs.append({
                            "filename": filename,
                            "timestamp": datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S,%f'),  # Parse timestamp
                            "log_type": log_type,
                            "message": message
                        })
                    except (IndexError, ValueError):
                        continue

    # Sort logs by timestamp (descending order)
    logs.sort(key=lambda log: log['timestamp'], reverse=True)
    return logs

ACCEPTED_LOG_TYPES = {"INFO", "DEBUG", "WARN", "ERROR"}

# Helper function to parse logs and return a DataFrame
def parse_logs_to_dataframe(folder_path: str) -> pd.DataFrame:
    """
    Parses log files from a specified folder and returns a DataFrame containing log data.

    Parameters:
    folder_path (str): The path to the folder containing log files. Each log file should be a text file with a '.log' extension.

    Returns:
    pd.DataFrame: A DataFrame containing the parsed log data. The DataFrame has two columns: 'timestamp' and 'log_type'.
    The 'timestamp' column contains datetime objects representing the log timestamps.
    The 'log_type' column contains strings representing the log types (INFO, DEBUG, WARN, ERROR).

    The function reads each log file in the specified folder, parses the log entries, and appends the relevant data to a list.
    It then creates a DataFrame from the parsed data and returns it.
    """
    data = []
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path) and filename.endswith('.log'):
            with open(file_path, 'r') as file:
                for line in file:
                    try:
                        parts = line.split(" - ")
                        timestamp = datetime.strptime(parts[0].strip(), '%Y-%m-%d %H:%M:%S,%f')
                        log_type = parts[2].strip().upper()  # Convert to uppercase for consistency
                        # Validate log type
                        if log_type in ACCEPTED_LOG_TYPES:
                            data.append({'timestamp': timestamp, 'log_type': log_type})
                    except (IndexError, ValueError):
                        continue
    # Create a DataFrame from the parsed data
    df = pd.DataFrame(data)
    return df
