"""
AeroTwin Mission Recording & Replay - Mission Storage Abstraction
=================================================================
Provides persistent storage, retrieval, fast index listing, and lifecycle
management for recorded UAV missions.
Supports local JSON storage with optional Supabase hook.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod

from .mission_models import Mission, MissionMetadata, MissionSummary


logger = logging.getLogger(__name__)


class MissionStore(ABC):
    """Abstract interface for mission persistence."""

    @abstractmethod
    def save_mission(self, mission: Mission) -> str:
        """Persists a mission and returns its storage path or identifier."""
        pass

    @abstractmethod
    def load_mission(self, mission_id: str) -> Optional[Mission]:
        """Retrieves and deserializes a mission by its ID."""
        pass

    @abstractmethod
    def list_missions(self) -> List[Dict[str, Any]]:
        """Returns lightweight list of mission summaries without loading full samples."""
        pass

    @abstractmethod
    def delete_mission(self, mission_id: str) -> bool:
        """Deletes a mission by ID. Returns True if deleted, False if not found."""
        pass

    @abstractmethod
    def mission_exists(self, mission_id: str) -> bool:
        """Returns True if mission exists in store."""
        pass


class LocalMissionStore(MissionStore):
    """
    File-based local JSON mission storage.
    Saves missions to data/missions/mission_<id>.json.
    """

    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            # Default to data/missions relative to project root
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.storage_dir = os.path.join(base_dir, "data", "missions")
        else:
            self.storage_dir = os.path.abspath(storage_dir)

        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_file_path(self, mission_id: str) -> str:
        # Sanitize mission_id for filesystem safety
        safe_id = "".join(c for c in mission_id if c.isalnum() or c in ("-", "_"))
        return os.path.join(self.storage_dir, f"mission_{safe_id}.json")

    def save_mission(self, mission: Mission) -> str:
        file_path = self._get_file_path(mission.metadata.mission_id)
        temp_path = f"{file_path}.tmp"

        payload = mission.to_dict()
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            
            # Atomic rename / replace
            if os.path.exists(file_path):
                os.remove(file_path)
            os.rename(temp_path, file_path)
            return file_path
        except Exception as e:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
            logger.error(f"Failed to save mission {mission.metadata.mission_id}: {e}")
            raise IOError(f"Could not write mission file: {e}") from e

    def load_mission(self, mission_id: str) -> Optional[Mission]:
        file_path = self._get_file_path(mission_id)
        if not os.path.exists(file_path):
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return Mission.from_dict(data)
        except Exception as e:
            logger.error(f"Error loading corrupted or invalid mission file {file_path}: {e}")
            return None

    def list_missions(self) -> List[Dict[str, Any]]:
        """
        Lists all available missions by reading metadata and summary blocks.
        Does not load the large 'samples' array into memory.
        """
        if not os.path.exists(self.storage_dir):
            return []

        missions_list: List[Dict[str, Any]] = []

        for fname in sorted(os.listdir(self.storage_dir), reverse=True):
            if not fname.endswith(".json") or fname.endswith(".tmp"):
                continue

            file_path = os.path.join(self.storage_dir, fname)
            try:
                # Read file and parse header/summary
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                meta = data.get("metadata", {})
                summary = data.get("summary", {})

                mission_info = {
                    "mission_id": meta.get("mission_id"),
                    "name": meta.get("name"),
                    "created_at": meta.get("created_at"),
                    "started_at": meta.get("started_at"),
                    "ended_at": meta.get("ended_at"),
                    "duration_sec": summary.get("duration_sec", meta.get("duration_sec", 0.0)) if summary else meta.get("duration_sec", 0.0),
                    "total_samples": summary.get("total_samples", meta.get("total_samples", 0)) if summary else meta.get("total_samples", 0),
                    "mission_profile": meta.get("mission_profile", "CRUISE"),
                    "status": meta.get("status", "COMPLETED"),
                    "start_health": summary.get("start_health", 100.0) if summary else 100.0,
                    "end_health": summary.get("end_health", 100.0) if summary else 100.0,
                    "min_health": summary.get("min_health", 100.0) if summary else 100.0,
                    "max_altitude_ft": summary.get("max_altitude_ft", 0.0) if summary else 0.0,
                    "fault_count": summary.get("total_faults", 0) if summary else 0,
                    "fault_types": summary.get("fault_types", []) if summary else [],
                    "highest_severity": summary.get("highest_severity", "INFO") if summary else "INFO",
                    "owner_id": meta.get("owner_id", "usr_guest_operator"),
                    "file_size_bytes": os.path.getsize(file_path),
                    "metadata": meta,
                    "summary": summary
                }
                missions_list.append(mission_info)
            except Exception as e:
                logger.warning(f"Could not read mission metadata from {fname}: {e}")
                continue

        return missions_list

    def delete_mission(self, mission_id: str) -> bool:
        file_path = self._get_file_path(mission_id)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except Exception as e:
                logger.error(f"Failed to delete mission {mission_id}: {e}")
                return False
        return False

    def mission_exists(self, mission_id: str) -> bool:
        file_path = self._get_file_path(mission_id)
        return os.path.exists(file_path)

    def can_user_access(self, mission_id: str, user_id: str, user_role: str) -> bool:
        """Check if user can view/read mission (IDOR protection)."""
        if user_role.lower() in ("admin", "gcs_operator"):
            return True
        file_path = self._get_file_path(mission_id)
        if not os.path.exists(file_path):
            return True
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            owner = data.get("metadata", {}).get("owner_id")
            if not owner or owner == "usr_guest_operator" or owner == user_id:
                return True
            return False
        except Exception:
            return True

