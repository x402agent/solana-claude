"""MiniMax API Client for multimodal generation (image, music, video, TTS)"""

import aiohttp
import asyncio
import base64
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class ImageRatio(str, Enum):
    """Image aspect ratios"""
    SQUARE = "1:1"
    PORTRAIT = "3:4"
    LANDSCAPE = "4:3"
    WIDESCREEN = "16:9"


class VideoRatio(str, Enum):
    """Video aspect ratios"""
    SQUARE = "1:1"
    PORTRAIT = "9:16"
    LANDSCAPE = "16:9"


@dataclass
class GenerationResult:
    """Result from a generation task"""
    task_id: str
    status: str
    file_id: Optional[str] = None
    download_url: Optional[str] = None
    error: Optional[str] = None


class MinimaxClient:
    """Client for MiniMax multimodal generation APIs"""

    BASE_URL = "https://api.minimaxi.chat/v1"

    def __init__(self, api_key: str):
        """Initialize MiniMax client.

        Args:
            api_key: MiniMax API key
        """
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None

    async def _ensure_session(self):
        """Ensure aiohttp session exists."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )

    async def close(self):
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()

    async def _post(self, endpoint: str, json_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make POST request to MiniMax API."""
        await self._ensure_session()

        url = f"{self.BASE_URL}{endpoint}"

        async with self.session.post(url, json=json_data) as response:
            response.raise_for_status()
            return await response.json()

    async def _get(self, endpoint: str) -> Dict[str, Any]:
        """Make GET request to MiniMax API."""
        await self._ensure_session()

        url = f"{self.BASE_URL}{endpoint}"

        async with self.session.get(url) as response:
            response.raise_for_status()
            return await response.json()

    async def _poll_task(
        self,
        task_id: str,
        max_wait: int = 300,
        poll_interval: int = 3
    ) -> GenerationResult:
        """Poll a task until completion or timeout.

        Args:
            task_id: Task ID to poll
            max_wait: Maximum time to wait in seconds
            poll_interval: Time between polls in seconds

        Returns:
            GenerationResult with task status and file info
        """
        start_time = asyncio.get_event_loop().time()

        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > max_wait:
                return GenerationResult(
                    task_id=task_id,
                    status="timeout",
                    error=f"Task timed out after {max_wait} seconds"
                )

            result = await self._get(f"/query/video_generation?task_id={task_id}")

            status = result.get("status")

            if status == "Success":
                file_id = result.get("file_id")
                return GenerationResult(
                    task_id=task_id,
                    status="success",
                    file_id=file_id,
                    download_url=f"{self.BASE_URL}/files/retrieve?file_id={file_id}"
                )
            elif status == "Failed":
                return GenerationResult(
                    task_id=task_id,
                    status="failed",
                    error=result.get("error", "Unknown error")
                )

            # Still processing, wait and retry
            await asyncio.sleep(poll_interval)

    async def generate_image(
        self,
        prompt: str,
        model: str = "text-to-image-v3",
        ratio: ImageRatio = ImageRatio.SQUARE,
        num_images: int = 1
    ) -> Dict[str, Any]:
        """Generate image from text prompt.

        Args:
            prompt: Text description of desired image
            model: Model to use (text-to-image-v3, image-to-image-v2)
            ratio: Aspect ratio for the image
            num_images: Number of images to generate (1-4)

        Returns:
            Response with image URLs
        """
        data = {
            "model": model,
            "prompt": prompt,
            "ratio": ratio.value,
            "n": min(max(num_images, 1), 4)
        }

        return await self._post("/image/generation", data)

    async def generate_image_from_image(
        self,
        prompt: str,
        image_url: str,
        ratio: ImageRatio = ImageRatio.SQUARE
    ) -> Dict[str, Any]:
        """Generate image from text prompt and reference image.

        Args:
            prompt: Text description of desired modifications
            image_url: URL or base64 of reference image
            ratio: Aspect ratio for the image

        Returns:
            Response with generated image URL
        """
        data = {
            "model": "image-to-image-v2",
            "prompt": prompt,
            "image_url": image_url,
            "ratio": ratio.value
        }

        return await self._post("/image/generation", data)

    async def generate_music(
        self,
        prompt: str,
        lyrics: Optional[str] = None,
        duration: int = 30,
        instrumental: bool = False
    ) -> Dict[str, Any]:
        """Generate music from text prompt.

        Args:
            prompt: Description of desired music style/mood
            lyrics: Optional lyrics to sing
            duration: Duration in seconds (max 120)
            instrumental: Generate instrumental only

        Returns:
            Response with audio file URL
        """
        data = {
            "model": "music-generation-v1",
            "prompt": prompt,
            "duration": min(duration, 120)
        }

        if lyrics and not instrumental:
            data["lyrics"] = lyrics

        if instrumental:
            data["type"] = "instrumental"

        return await self._post("/music/generation", data)

    async def generate_video(
        self,
        prompt: str,
        first_frame_image: Optional[str] = None,
        last_frame_image: Optional[str] = None,
        ratio: VideoRatio = VideoRatio.LANDSCAPE,
        duration: int = 5,
        wait_for_completion: bool = True,
        max_wait: int = 300
    ) -> GenerationResult:
        """Generate video from text prompt.

        Args:
            prompt: Description of desired video
            first_frame_image: Optional URL/base64 of first frame
            last_frame_image: Optional URL/base64 of last frame
            ratio: Aspect ratio for video
            duration: Duration in seconds (2-6)
            wait_for_completion: Whether to poll until complete
            max_wait: Maximum time to wait in seconds

        Returns:
            GenerationResult with video file info
        """
        data = {
            "model": "video-generation-v1",
            "prompt": prompt,
            "ratio": ratio.value,
            "duration": max(2, min(duration, 6))
        }

        if first_frame_image:
            data["first_frame_image"] = first_frame_image

        if last_frame_image:
            data["last_frame_image"] = last_frame_image

        response = await self._post("/video/generation", data)
        task_id = response.get("task_id")

        if not task_id:
            return GenerationResult(
                task_id="",
                status="failed",
                error="No task_id returned"
            )

        if wait_for_completion:
            return await self._poll_task(task_id, max_wait=max_wait)
        else:
            return GenerationResult(
                task_id=task_id,
                status="processing"
            )

    async def text_to_speech(
        self,
        text: str,
        voice_id: str = "default",
        speed: float = 1.0,
        pitch: float = 1.0
    ) -> Dict[str, Any]:
        """Convert text to speech.

        Args:
            text: Text to convert to speech
            voice_id: Voice ID to use
            speed: Speech speed (0.5-2.0)
            pitch: Voice pitch (0.5-2.0)

        Returns:
            Response with audio file URL
        """
        data = {
            "model": "speech-generation-v1",
            "text": text,
            "voice_id": voice_id,
            "speed": max(0.5, min(speed, 2.0)),
            "pitch": max(0.5, min(pitch, 2.0))
        }

        return await self._post("/speech/generation", data)

    async def download_file(self, file_id: str) -> bytes:
        """Download a generated file.

        Args:
            file_id: File ID from generation result

        Returns:
            File content as bytes
        """
        await self._ensure_session()

        url = f"{self.BASE_URL}/files/retrieve?file_id={file_id}"

        async with self.session.get(url) as response:
            response.raise_for_status()
            return await response.read()

    async def save_file(self, file_id: str, output_path: str):
        """Download and save a generated file.

        Args:
            file_id: File ID from generation result
            output_path: Path to save file
        """
        content = await self.download_file(file_id)

        with open(output_path, "wb") as f:
            f.write(content)
