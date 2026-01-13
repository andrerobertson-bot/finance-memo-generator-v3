
document.getElementById("pdfForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch("/api/generate", {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    alert("PDF generation failed");
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
});
