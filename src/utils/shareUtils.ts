/**
 * Utility to share weather alerts, safety advisories, and nearby assistance locations
 * utilizing the Web Share API (with reliable fallback to clipboard copy).
 */

export interface ShareAlertData {
  title: string;
  text: string;
  url?: string;
  locationName?: string;
}

export async function shareWeatherAlert(data: ShareAlertData): Promise<{
  success: boolean;
  method: "web-share" | "clipboard" | "failed";
  message: string;
}> {
  const shareTitle = data.title || "Severe Weather Alert";
  const shareText = data.text;
  const shareUrl = data.url || window.location.href;

  // 1. Try standard Web Share API if supported and user-activatable
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    const payload = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    };

    if (navigator.canShare(payload)) {
      try {
        await navigator.share(payload);
        return {
          success: true,
          method: "web-share",
          message: "Alert shared successfully.",
        };
      } catch (err: any) {
        // If user cancelled, don't treat as an error
        if (err.name === "AbortError") {
          return {
            success: true,
            method: "web-share",
            message: "Share dialog closed.",
          };
        }
        console.warn("Web Share API failed, attempting clipboard fallback:", err);
      }
    }
  }

  // 2. Fallback to Clipboard Copy
  try {
    const fallbackText = `${shareTitle}\n${shareText}\n\nLive Weather Tracking: ${shareUrl}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fallbackText);
      return {
        success: true,
        method: "clipboard",
        message: "Alert details copied to clipboard!",
      };
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = fallbackText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (copied) {
        return {
          success: true,
          method: "clipboard",
          message: "Alert details copied to clipboard!",
        };
      }
    }
  } catch (clipErr) {
    console.error("Clipboard copy failed:", clipErr);
  }

  return {
    success: false,
    method: "failed",
    message: "Unable to share or copy alert.",
  };
}
