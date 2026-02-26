"""Tests for file_service — MIME validation and path traversal prevention."""
import pytest

from app.services.file_service import ALLOWED_VIDEO_MIMES, delete_file, save_upload


def test_save_upload_rejects_empty_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.file_service.settings.storage_path", tmp_path)
    with pytest.raises(ValueError, match="empty"):
        save_upload(b"", "test.mp4", "video")


def test_save_upload_rejects_non_video_claiming_mp4(tmp_path, monkeypatch):
    """A file with text content claiming to be video/mp4 should be rejected."""
    monkeypatch.setattr("app.services.file_service.settings.storage_path", tmp_path)
    with pytest.raises(ValueError, match="File type not permitted"):
        save_upload(b"not a video at all, just text content", "fake.mp4", "video")


def test_save_upload_rejects_unknown_category(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.file_service.settings.storage_path", tmp_path)
    with pytest.raises(ValueError, match="Unknown upload category"):
        save_upload(b"data", "file.xyz", "executable")


def test_delete_file_outside_storage_is_noop(tmp_path, monkeypatch, tmp_path_factory):
    """delete_file must not delete files outside storage/."""
    monkeypatch.setattr("app.services.file_service.settings.storage_path", tmp_path)
    external = tmp_path_factory.mktemp("external") / "secret.txt"
    external.write_text("secret content")

    delete_file(str(external))  # should silently skip
    assert external.exists()  # still there


def test_delete_file_nonexistent_is_noop(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.file_service.settings.storage_path", tmp_path)
    delete_file(str(tmp_path / "nonexistent.mp4"))  # no error


def test_delete_file_none_is_noop():
    delete_file(None)  # no error
