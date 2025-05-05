import os
from flask import Blueprint, request, jsonify, session, redirect, render_template
from flask_limiter import Limiter
from flask_cors import CORS
from flask_limiter.util import get_remote_address
from pydantic import ValidationError
import database.firebase_operations as firebase_operations
from util.models import UserEmailRequest
from util.utils import get_email_username
from util.google import get_current_user_profile_google
from util.logit import get_logger
from google_auth_oauthlib.flow import Flow
from util.authlib import requires_scope
from config.config import settings

OAUTHLIB_INSECURE_TRANSPORT = 1

# Initialize Blueprint and Limiter
google_bp = Blueprint("google", __name__)
limiter = Limiter(key_func=get_remote_address)
CORS(google_bp, resources=settings.CORS_resource_allow_all)

logger = get_logger("logs", "Google")


@google_bp.before_request
def log_google_requests():
    logger.info("Google blueprint request received.")


@google_bp.route("/healthcheck", methods=["GET"])
def google_healthcheck():
    logger.info("Google Service healthcheck requested")
    return jsonify({"status": "ok", "service": "Google Service"}), 200


# Constants for Google OAuth
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/iam.test",
    "https://www.googleapis.com/auth/youtube.download",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/youtubepartner-channel-audit",
    "https://www.googleapis.com/auth/youtubepartner",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.third-party-link.creator",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.channel-memberships.creator",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/service.management.readonly",
    "https://www.googleapis.com/auth/service.management",
    "openid",
]  # Adjust scopes as needed
# Path to your downloaded client secrets file
current_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# This file lives in …/SpotifySDK-Research/server/Blueprints/your_module.py
MODULE_DIR = os.path.dirname(os.path.abspath(__file__))

# Go up one level to …/SpotifySDK-Research/server
SERVER_ROOT = os.path.abspath(os.path.join(MODULE_DIR, os.pardir))

# Now set the client-secrets path to server/keys/…
GOOGLE_CLIENT_SECRETS_FILE = os.path.join(
    SERVER_ROOT,
    "keys",
    "client_secret_test.json"
)

# Make sure to set a secret key for Flask session management in your app
# configuration


@google_bp.route("/google_api_bind", methods=["GET"])
def google_api_bind():
    """
    Initiate the OAuth 2.0 flow with Google by redirecting the user
    to the authorization URL, using user_email passed as a query param.
    """
    user_email = request.args.get("user_email", type=str)
    if not user_email:
        return jsonify({"error": "Missing required query parameter 'user_email'"}), 400

    try:
        payload = UserEmailRequest(user_email=user_email)
    except ValidationError as ve:
        return jsonify({"error": ve.errors()}), 400

    session["user_email"] = payload.user_email
    try:
        flow = Flow.from_client_secrets_file(
            GOOGLE_CLIENT_SECRETS_FILE,
            scopes=GOOGLE_SCOPES,
            redirect_uri="https://api-sync-branch.yggbranch.dev/google/google_api_callback",
        )
        authorization_url, state = flow.authorization_url(
            access_type="offline", prompt="consent", include_granted_scopes="true"
        )
        session["google_oauth_state"] = state
        logger.info("Redirecting user to Google OAuth consent screen.")
        return redirect(authorization_url)

    except Exception as e:
        logger.error("Error initiating Google OAuth flow: %s", e)
        return jsonify({
            "error": "Failed to initiate Google OAuth flow.",
        }), 500


@google_bp.route("/google_api_callback", methods=["GET"])
def google_api_callback():
    """
    Handle the OAuth 2.0 callback from Google. This endpoint exchanges the authorization code
    for an access token, saves the token details to the database, and returns a success message.
    """
    try:
        # Verify the OAuth state from the session
        state = session.get("google_oauth_state")
        if not state:
            logger.error("Missing OAuth state in session.")
            return jsonify({"error": "Session state missing."}), 400

        # Recreate the OAuth flow with the stored state and fetch the token
        # using the full callback URL
        flow = Flow.from_client_secrets_file(
            GOOGLE_CLIENT_SECRETS_FILE,
            scopes=GOOGLE_SCOPES,
            state=state,
            redirect_uri="https://api-sync-branch.yggbranch.dev/google/google_api_callback",
        )
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials

        # Extract token information
        access_token = credentials.token
        refresh_token = credentials.refresh_token
        token_expires_at = (
            credentials.expiry.isoformat() if credentials.expiry else None
        )
        scopes = ",".join(credentials.scopes) if credentials.scopes else ""

        # Retrieve the current user's identifier.
        # For demonstration purposes, assume a "user_email" is passed as a
        # query parameter.
        user_email = session.get("user_email")
        if not user_email:
            logger.error("Missing user_email parameter in callback.")
            return jsonify({"error": "Missing user_email parameter."}), 400

        # Fetch the user_id from the users table
        user_id = firebase_operations.get_user_id_by_email(user_email)
        if not user_id:
            logger.error("User not found for email: %s", user_email)
            return jsonify({"error": "User not found."}), 404

        # Fetch the app_id for the Google app from the Apps table.
        # Assumes your app is registered with the name "Google".
        app_id = firebase_operations.get_app_id_by_name("Google")
        if not app_id:
            logger.error("Google app not configured in Apps table.")
            return jsonify({"error": "Google app not configured."}), 400

        existing_rows = firebase_operations.get_userlinkedapps_tokens(
            user_id, app_id)
        if existing_rows and existing_rows[0]:
            logger.info(
                "User already connected for user_id: %s, app_id: %s", user_id, app_id
            )
            # Optionally, you might update the existing token details here.

            # return render_template(
            # "google.html",
            # success = True, user_id = get_email_username(user_email)), 200

            # return jsonify({
            #    "message": "User already connected.",
            #    "access_token": access_token,
            #    "refresh_token": refresh_token,
            #    "token_expires_at": token_expires_at,
            #    "scopes": scopes
            # }), 200

        # Save the token details into the database.
        firebase_operations.delete_userlinkedapps(user_id, 4)
        firebase_operations.delete_userlinkedapps(user_id, 3)

        firebase_operations.insert_userlinkedapps(
            user_id, 4, access_token, refresh_token, token_expires_at, scopes
        )
        firebase_operations.insert_userlinkedapps(
            user_id, 3, access_token, refresh_token, token_expires_at, scopes
        )
        logger.info(
            "Google API token saved for user_id: %s, app_id: %s", user_id, app_id
        )

        return (
            render_template(
                "google.html", success=True, user_id=get_email_username(user_email)
            ),
            200,
        )

        # return jsonify({
        #    "message": "Google API bound and token saved successfully.",
        #    "access_token": access_token,
        #    "refresh_token": refresh_token,
        #    "token_expires_at": token_expires_at,
        #    "scopes": scopes
        # }), 200

    except Exception as e:
        logger.error("Error during Google OAuth callback: %s", e)
        return jsonify(
            {"error": "Failed to complete Google OAuth callback."}), 500


@google_bp.route("/google_profile", methods=["POST"])
@requires_scope("google")
def google_profile():
    """
    Endpoint to retrieve the current user's Google profile information.
    It expects that the user is already bound (i.e., tokens are stored in the database).

    Parameters:
    request (flask.Request): The incoming request object containing the user's email.

    Returns:
    flask.Response:
        - If the user's email is missing or not found in the session, returns a jsonify object with an error message.
        - If the user's ID or Google app ID is not found, returns a jsonify object with an error message.
        - If no token is found for the user and app, returns a jsonify object with an error message.
        - If the Google profile retrieval fails, returns a jsonify object with an error message.
        - Otherwise, returns the user's Google profile information as a jsonify object.
    """
    try:
        payload = UserEmailRequest.parse_obj(request.get_json())
    except ValidationError as ve:
        return jsonify({"error": ve.errors()}), 400

    user_email = payload.user_email

    try:
        # print(user_email)
        if not user_email:
            return jsonify({"error": "Missing user_email in session."}), 400

        # Retrieve user_id based on email
        user_id = firebase_operations.get_user_id_by_email(user_email)
        if not user_id:
            return jsonify({"error": "User not found."}), 404

        # print(user_id)

        # Retrieve the Google app id (assumes your app is registered with the
        # name "Google")
        app_id_data = firebase_operations.get_app_id_by_name("Google")
        if not app_id_data:
            return jsonify({"error": "Google app not configured."}), 400
        app_id = app_id_data

        # print(app_id)

        # Retrieve stored token details
        tokens_data = firebase_operations.get_userlinkedapps_tokens(
            user_id, app_id)
        if not tokens_data or not tokens_data[0]:
            return (
                jsonify(
                    {"error": "No token found. Please bind your account first."}),
                400,
            )

        # Assuming tokens_data returns a dictionary with keys "access_token" and "refresh_token"
        # print(tokens_data)
        # print(tokens_data[0])
        # print(tokens_data[0]["access_token"])
        access_token = tokens_data[0]["access_token"]
        # print(access_token)

        # Get the user's Google profile using the helper function
        profile = get_current_user_profile_google(access_token, user_id)
        # print(profile)
        if profile is None:
            return jsonify(
                {"error": "Failed to fetch Google user profile."}), 500

        return jsonify(profile), 200

    except Exception as e:
        logger.error("Error fetching Google user profile: %s", e)
        return jsonify({"error": "Failed to fetch Google user profile."}), 500


def get_google_profile(user_email):
    """
    Endpoint to retrieve the current user's Google profile information.
    It expects that the user is already bound (i.e., tokens are stored in the database).

    Parameters:
    user_email (str): The email of the user for whom the Google profile needs to be fetched.

    Returns:
    dict or jsonify object:
        - If the user's email is missing or not found in the session, returns a jsonify object with an error message.
        - If the user's ID or Google app ID is not found, returns a jsonify object with an error message.
        - If no token is found for the user and app, returns a jsonify object with an error message.
        - If the Google profile retrieval fails, returns a jsonify object with an error message.
        - Otherwise, returns the user's Google profile information.
    """

    try:
        # print(user_email)
        if not user_email:
            return jsonify({"error": "Missing user_email in session."}), 400

        # Retrieve user_id based on email
        user_id = firebase_operations.get_user_id_by_email(user_email)
        if not user_id:
            return jsonify({"error": "User not found."}), 404

        # print(user_id)

        # Retrieve the Google app id (assumes your app is registered with the
        # name "Google")
        app_id_data = firebase_operations.get_app_id_by_name("Google")
        if not app_id_data:
            return jsonify({"error": "Google app not configured."}), 400
        app_id = app_id_data

        # print(app_id)

        # Retrieve stored token details
        tokens_data = firebase_operations.get_userlinkedapps_tokens(
            user_id, app_id)
        if not tokens_data or not tokens_data[0]:
            return (
                jsonify(
                    {"error": "No token found. Please bind your account first."}),
                400,
            )

        # Assuming tokens_data returns a dictionary with keys "access_token" and "refresh_token"
        # print(tokens_data)
        # print(tokens_data[0])
        # print(tokens_data[0]["access_token"])
        access_token = tokens_data[0]["access_token"]
        # print(access_token)

        # Get the user's Google profile using the helper function
        profile = get_current_user_profile_google(access_token, user_id)
        # print(profile)
        if profile is None:
            return jsonify(
                {"error": "Failed to fetch Google user profile."}), 500

        return profile

    except Exception as e:
        logger.error("Error fetching Google user profile: %s", e)
        return jsonify({"error": "Failed to fetch Google user profile."}), 500
