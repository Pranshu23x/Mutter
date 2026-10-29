# Play Store release checklist

## Before uploading

- Set `SUPPORT_EMAIL` to a monitored support address. Deploy the backend over HTTPS and use `https://YOUR_DOMAIN/privacy` as the Privacy Policy URL and `https://YOUR_DOMAIN/account-deletion` as the account-deletion URL.
- Build from a short Windows path (for example `C:\src\mutter`) or use CI/EAS Build. The current workspace path exceeds the CMake/Ninja object-path limit during Android release builds.
- Upload an Android App Bundle (`.aab`), not the debug APK.
- Confirm the release signing key is not committed and rotate its password if it has ever been exposed.

## Play Console declarations

- Complete Data safety accurately: email/account data, microphone audio, transcripts/translations, app usage, and payment/subscription data; list the actual service providers.
- Complete the AccessibilityService declaration. Upload an unlisted review video showing: the full in-app disclosure, consent and denial paths, enabling Mutter in Android Settings, and user-triggered insertion into a text field.
- Provide review credentials and exact steps to exercise dictation and the accessibility feature.
- Add store listing content: support email, privacy URL, deletion URL, screenshots, feature graphic, and accurate description.

## Billing

Third-party Razorpay checkout is disabled in the Play client. Do not re-enable it until either Google Play Billing is integrated with Play Console products, or the project is enrolled in an eligible Google alternative-billing program and its requirements are implemented.
