from flask import Blueprint, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity
from util.logit import get_logger
import database.firebase_operations as firebase_operations
from util.authlib import requires_scope
from config.config import settings

profile_bp = Blueprint("profile", __name__)

logger = get_logger("logs", "Profile")
CORS(profile_bp, resources=settings.CORS_resource_allow_all)


@profile_bp.before_request
def log_profile_requests():
    logger.info("Profile blueprint request received.")


@profile_bp.route("/healthcheck", methods=["GET"])
def profile_healthcheck():
    logger.info("Profile Service healthcheck requested")
    return jsonify({"status": "ok", "service": "Profile Service"}), 200


@profile_bp.route("/view", methods=["POST"])
@jwt_required()
@requires_scope("me")
def view_profile():
    """
    This function retrieves and returns the user profile information.

    Parameters:
    None

    Returns:
    JSON object containing user profile information if found, else returns an error message.
    The JSON object has the following structure:
    {
        "first_name": str,
        "last_name": str,
        "avatar_url": str,
        "bio": str
    }
    or
    {
        "error": str
    }
    """
    current_user = get_jwt_identity()
    print(current_user)

    user_id = firebase_operations.get_user_id_by_email(current_user)

    print(user_id)

    rows = firebase_operations.get_user_profile(user_id)
    print(rows)
    try:
        if rows[0] != []:
            user = rows[0]
            return (
                jsonify(
                    {
                        "first_name": user["first_name"],
                        "last_name": user["last_name"],
                        "avatar_url": user["avatar_url"],
                        "bio": user["bio"],
                    }
                ),
                200,
            )
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        logger.error("An error occurred while fetching user profile.", e)()
        return jsonify({"error": "An error occurred while fetching user profile."}), 404


@profile_bp.route('/chain_status', methods=['POST'])
@jwt_required()
@requires_scope("me")
def get_current_user_chain_status():
    current_user = get_jwt_identity()
    user_id = firebase_operations.get_user_id_by_email(current_user)
    chain_status = firebase_operations.get_user_chain_status(user_id)
    if chain_status:
        return jsonify(chain_status), 200
    return jsonify({"error": "Chain not found"}), 404

@profile_bp.route('/chain_status_update', methods=['POST'])
@jwt_required()
@requires_scope("me")
def update_user_chain_status():
    current_user = get_jwt_identity()
    user_id = firebase_operations.get_user_id_by_email(current_user)
    data = request.get_json()
    # e.g. data = { "action": "completed" }
    result = firebase_operations.upsert_user_chain(user_id, data)
    return jsonify(result), 200
