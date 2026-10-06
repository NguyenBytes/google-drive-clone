"""Link a new Google identity to a confirmed local account with verified email."""

import boto3
from botocore.config import Config

cognito = boto3.client("cognito-idp", config=Config(
    connect_timeout=1, read_timeout=2, retries={"total_max_attempts": 1},
))


def handler(event, context):
    if event.get("triggerSource") != "PreSignUp_ExternalProvider":
        return event

    provider, separator, subject = event.get("userName", "").partition("_")
    if provider.lower() != "google" or not separator or not subject:
        return event

    attributes = event.get("request", {}).get("userAttributes", {})
    email = attributes.get("email", "").strip()
    if not email or str(attributes.get("email_verified", "")).lower() != "true":
        raise ValueError("Google must provide a verified email address.")

    escaped_email = email.replace("\\", "\\\\").replace('"', '\\"')
    candidates = []
    arguments = {
        "UserPoolId": event["userPoolId"],
        "Filter": f'email = "{escaped_email}"',
    }
    while True:
        result = cognito.list_users(**arguments)
        for user in result.get("Users", []):
            saved = {item["Name"]: item["Value"] for item in user.get("Attributes", [])}
            if (user.get("Enabled") and user.get("UserStatus") == "CONFIRMED"
                    and saved.get("email_verified") == "true"
                    and saved.get("email") == email and not saved.get("identities")):
                candidates.append(user["Username"])
        token = result.get("PaginationToken")
        if not token:
            break
        arguments["PaginationToken"] = token

    if len(candidates) > 1:
        raise ValueError("Multiple verified accounts match this email. Contact support.")
    if candidates:
        cognito.admin_link_provider_for_user(
            UserPoolId=event["userPoolId"],
            DestinationUser={"ProviderName": "Cognito", "ProviderAttributeValue": candidates[0]},
            SourceUser={
                "ProviderName": "Google",
                "ProviderAttributeName": "Cognito_Subject",
                "ProviderAttributeValue": subject,
            },
        )
    return event
