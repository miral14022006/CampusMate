import cv2
import numpy as np
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class ImagePreprocessor:
    """
    OpenCV preprocessing pipeline for scanned notices:
    1. Grayscale conversion
    2. Non-local means denoising (or Gaussian blur)
    3. Adaptive / Otsu binarization threshold
    4. Deskewing via minimum area bounding rectangle
    5. Optional upscaling (2x bicubic interpolation for small fonts)
    """

    def __init__(self, apply_upscale: bool = True):
        self.apply_upscale = apply_upscale

    def preprocess(self, image: np.ndarray, apply_pipeline: bool = True) -> Tuple[np.ndarray, float]:
        """
        Executes preprocessing.
        Returns:
            processed_image: np.ndarray
            skew_angle: float
        """
        if not apply_pipeline:
            # Baseline: raw grayscale only
            if len(image.shape) == 3:
                return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 0.0
            return image, 0.0

        # 1. Grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # 2. Optional Upscaling (2x) for small scans
        if self.apply_upscale and (gray.shape[0] < 1200 or gray.shape[1] < 1200):
            gray = cv2.resize(gray, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

        # 3. Denoising
        denoised = cv2.GaussianBlur(gray, (3, 3), 0)

        # 4. Otsu Adaptive Thresholding
        thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]

        # 5. Deskewing
        deskewed, angle = self.deskew(thresh)

        return deskewed, angle

    def deskew(self, image: np.ndarray) -> Tuple[np.ndarray, float]:
        """Calculates skew angle and rotates image to level orientation."""
        # Invert colors so text is foreground white
        pts = np.column_stack(np.where(image == 0))
        if len(pts) < 10:
            return image, 0.0

        # Compute minimum rotated bounding box
        rect = cv2.minAreaRect(pts)
        angle = rect[-1]

        # OpenCV minAreaRect returns angle in [-90, 0)
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Cap extreme rotations (likely false orientation)
        if abs(angle) > 25.0:
            return image, 0.0

        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )

        return rotated, round(float(angle), 2)

image_preprocessor = ImagePreprocessor()

