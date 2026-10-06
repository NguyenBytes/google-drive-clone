import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch

with patch.dict(sys.modules, {"boto3": MagicMock(), "botocore.config": MagicMock()}):
    spec = importlib.util.spec_from_file_location(
        "link_google_account", Path(__file__).with_name("link_google_account.py"),
    )
    linking = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(linking)


class LinkingTests(unittest.TestCase):
    def setUp(self):
        linking.cognito = MagicMock()
        self.event = {
            "triggerSource": "PreSignUp_ExternalProvider",
            "userName": "Google_12345", "userPoolId": "pool",
            "request": {"userAttributes": {
                "email": "keith.chen.dev@gmail.com", "email_verified": "true",
            }},
        }
        self.local_user = {
            "Username": "keith-chen", "Enabled": True, "UserStatus": "CONFIRMED",
            "Attributes": [
                {"Name": "email", "Value": "keith.chen.dev@gmail.com"},
                {"Name": "email_verified", "Value": "true"},
            ],
        }
        linking.cognito.list_users.return_value = {"Users": [self.local_user]}

    def test_links_google_subject_to_verified_local_username(self):
        self.assertIs(linking.handler(self.event, None), self.event)
        linking.cognito.admin_link_provider_for_user.assert_called_once_with(
            UserPoolId="pool",
            DestinationUser={"ProviderName": "Cognito", "ProviderAttributeValue": "keith-chen"},
            SourceUser={"ProviderName": "Google", "ProviderAttributeName": "Cognito_Subject",
                        "ProviderAttributeValue": "12345"},
        )

    def test_unverified_google_email_is_rejected(self):
        self.event["request"]["userAttributes"]["email_verified"] = "false"
        with self.assertRaises(ValueError):
            linking.handler(self.event, None)
        linking.cognito.admin_link_provider_for_user.assert_not_called()

    def test_unverified_local_account_is_not_linked(self):
        self.local_user["Attributes"][1]["Value"] = "false"
        linking.handler(self.event, None)
        linking.cognito.admin_link_provider_for_user.assert_not_called()

    def test_multiple_verified_accounts_are_rejected(self):
        linking.cognito.list_users.return_value = {"Users": [self.local_user, self.local_user]}
        with self.assertRaises(ValueError):
            linking.handler(self.event, None)
        linking.cognito.admin_link_provider_for_user.assert_not_called()

    def test_checks_later_pages(self):
        linking.cognito.list_users.side_effect = [
            {"Users": [], "PaginationToken": "next"}, {"Users": [self.local_user]},
        ]
        linking.handler(self.event, None)
        linking.cognito.admin_link_provider_for_user.assert_called_once()

    def test_normal_signup_is_unchanged(self):
        self.event["triggerSource"] = "PreSignUp_SignUp"
        linking.handler(self.event, None)
        linking.cognito.list_users.assert_not_called()

    def test_new_google_user_is_not_linked(self):
        linking.cognito.list_users.return_value = {"Users": []}
        linking.handler(self.event, None)
        linking.cognito.admin_link_provider_for_user.assert_not_called()


if __name__ == "__main__":
    unittest.main()
