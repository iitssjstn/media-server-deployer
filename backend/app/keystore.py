import os
import uuid
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

KEYS_DIR = Path(__file__).resolve().parent.parent / "keys"
KEYS_DIR.mkdir(exist_ok=True)


def generate_keypair() -> tuple[str, str]:
    """Generate an ed25519 SSH keypair. Returns (key_id, public_key_string)."""
    key_id = str(uuid.uuid4())

    private_key = Ed25519PrivateKey.generate()

    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    )

    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH,
    )

    key_path = KEYS_DIR / key_id
    key_path.write_bytes(private_bytes)
    os.chmod(key_path, 0o600)

    return key_id, public_bytes.decode("utf-8")


def get_private_key_path(key_id: str) -> Path | None:
    """Return the path to a stored private key, or None if not found."""
    key_path = KEYS_DIR / key_id
    if key_path.is_file():
        return key_path
    return None


def delete_key(key_id: str) -> None:
    """Remove a stored private key."""
    key_path = KEYS_DIR / key_id
    if key_path.is_file():
        key_path.unlink()
