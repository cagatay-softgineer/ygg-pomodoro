from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from util.logit import get_logger
import database.firebase_operations as firebase_operations

profile_bp = Blueprint('profile', __name__)

logger = get_logger("logs/profile.log", "Profile")

@profile_bp.route('/view', methods=['GET'])
@jwt_required()
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

    rows = firebase_operations.get_user_profile(user_id)
    print(rows)
    if rows[0] != []:
        user = rows[0]
        return jsonify({
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "avatar_url": user["avatar_url"],
            "bio" : user["bio"],
        }), 200
    return jsonify({"error": "User not found"}), 404

