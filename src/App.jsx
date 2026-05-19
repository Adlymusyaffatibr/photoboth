import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef();

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [strip, setStrip] = useState(null);

  const templates = [
    {
      id: 1,
      name: "White",
      color: "#ffffff",
      preview: "bg-white",
    },
    {
      id: 2,
      name: "Black",
      color: "#000000",
      preview: "bg-black",
    },
    {
      id: 3,
      name: "Pink",
      color: "#ffc0cb",
      preview: "bg-pink-300",
    },
  ];

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // =========================
  // FRAME DESIGN
  // =========================
  const drawFrameOnPhoto = (ctx, width, height, templateName) => {
    const isDark = templateName === "Black";

    const frameColor = templateName === "Pink" ? "#ff4fa3" : templateName === "Black" ? "#ffffff" : "#d9d9d9";

    const accentColor = templateName === "Pink" ? "#ff1493" : templateName === "Black" ? "#888888" : "#bbbbbb";

    ctx.save();

    // =========================
    // OUTER BORDER
    // =========================
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // =========================
    // INNER DASHED BORDER
    // =========================
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;

    ctx.setLineDash([10, 10]);

    ctx.strokeRect(25, 25, width - 50, height - 50);

    ctx.setLineDash([]);

    // =========================
    // TOP BANNER
    // =========================
    ctx.fillStyle = frameColor;

    ctx.fillRect(0, 0, width, 80);

    ctx.font = 'bold 42px "Arial"';

    ctx.textAlign = "center";

    ctx.fillStyle = isDark ? "#000000" : "#ffffff";

    // TEMPLATE TEXT
    if (templateName === "Pink") {
      ctx.fillText("🧸 ☁️ LOVE ☁️ 🧸", width / 2, 52);
    }

    if (templateName === "Black") {
      ctx.fillText("🖤 DARK NIGHT 🖤", width / 2, 52);
    }

    if (templateName === "White") {
      ctx.fillText("☁️ PURE DREAM ☁️", width / 2, 52);
    }

    // =========================
    // BOTTOM BANNER
    // =========================
    ctx.fillStyle = frameColor;

    ctx.fillRect(0, height - 80, width, 80);

    ctx.font = 'bold 34px "Arial"';

    ctx.fillStyle = isDark ? "#000000" : "#ffffff";

    if (templateName === "Pink") {
      ctx.fillText("☁️ 💖 SWEET DAY 💖 ☁️", width / 2, height - 28);
    }

    if (templateName === "Black") {
      ctx.fillText("🦇 MOONLIGHT 🦇", width / 2, height - 28);
    }

    if (templateName === "White") {
      ctx.fillText("☀️ CLOUDY SKY ☀️", width / 2, height - 28);
    }

    // =========================
    // SIDE ORNAMENT
    // =========================
    ctx.font = '42px "Segoe UI Emoji"';

    if (templateName === "Pink") {
      ctx.fillText("☁️", 35, 170);
      ctx.fillText("🧸", width - 45, 250);

      ctx.fillText("💖", 35, height - 220);
      ctx.fillText("☁️", width - 45, height - 140);
    }

    if (templateName === "Black") {
      ctx.fillText("🦇", 35, 170);
      ctx.fillText("🌙", width - 45, 250);

      ctx.fillText("🖤", 35, height - 220);
      ctx.fillText("🦇", width - 45, height - 140);
    }

    if (templateName === "White") {
      ctx.fillText("☁️", 35, 170);
      ctx.fillText("☀️", width - 45, 250);

      ctx.fillText("🤍", 35, height - 220);
      ctx.fillText("☁️", width - 45, height - 140);
    }
    

    ctx.restore();
  };

  // =========================
  // LIVE PREVIEW
  // =========================
  useEffect(() => {
    if (!selectedTemplate || !webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;

    if (!video) return;

    const canvas = canvasRef.current;

    const ctx = canvas.getContext("2d");

    const draw = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;

        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        drawFrameOnPhoto(ctx, canvas.width, canvas.height, selectedTemplate.name);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationRef.current);
  }, [selectedTemplate]);

  // =========================
  // CAPTURE PHOTO
  // =========================
  const captureWithFrame = () => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;

    const capturedCanvas = document.createElement("canvas");

    capturedCanvas.width = canvas.width;

    capturedCanvas.height = canvas.height;

    const ctx = capturedCanvas.getContext("2d");

    ctx.drawImage(canvas, 0, 0);

    return capturedCanvas.toDataURL("image/png");
  };

  // =========================
  // START CAPTURE
  // =========================
  const startCapture = async () => {
    if (isCapturing) return;

    setPhotos([]);

    setStrip(null);

    setIsCapturing(true);

    let capturedPhotos = [];

    for (let i = 0; i < 4; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);

        await wait(1000);
      }

      setCountdown("📸");

      await wait(700);

      const image = captureWithFrame();

      capturedPhotos.push(image);

      setPhotos([...capturedPhotos]);

      await wait(800);
    }

    setCountdown(null);

    await generateStrip(capturedPhotos);

    setIsCapturing(false);
  };

  // =========================
  // GENERATE PHOTO STRIP
  // =========================
  const generateStrip = async (capturedPhotos) => {
    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");

    const width = 430;

    const photoWidth = 350;

    const photoHeight = 250;

    const gap = 25;

    canvas.width = width;

    canvas.height = (photoHeight + gap) * 4 + 180;

    // Background
    ctx.fillStyle = selectedTemplate.color;

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw photos
    for (let i = 0; i < capturedPhotos.length; i++) {
      const img = new Image();

      img.src = capturedPhotos[i];

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const y = 90 + i * (photoHeight + gap);

      ctx.shadowColor = "rgba(0,0,0,0.25)";

      ctx.shadowBlur = 10;

      ctx.drawImage(img, 40, y, photoWidth, photoHeight);

      ctx.shadowBlur = 0;
    }

    setStrip(canvas.toDataURL("image/png"));
  };

  // =========================
  // TEMPLATE PAGE
  // =========================
  if (!selectedTemplate) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-6 py-10">
        <h1 className="text-5xl font-bold text-center">Photobooth</h1>

        <p className="text-center text-zinc-400 mt-3">Pilih template favorit kamu 📸</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 max-w-5xl mx-auto">
          {templates.map((template) => (
            <div key={template.id} onClick={() => setSelectedTemplate(template)} className="bg-zinc-900 rounded-3xl p-5 cursor-pointer hover:scale-105 duration-300 border border-zinc-800">
              <div className={`h-96 rounded-2xl ${template.preview} flex items-center justify-center`}>
                <h2 className={`text-4xl font-bold ${template.name === "Black" ? "text-white" : "text-black"}`}>{template.name}</h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isDark = selectedTemplate.color === "#000000";

  // =========================
  // MAIN PAGE
  // =========================
  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-10"
      style={{
        background: selectedTemplate.color,
      }}
    >
      <h1 className={`text-5xl font-bold mb-8 ${isDark ? "text-white" : "text-black"}`}>Photobooth 📸</h1>

      {/* Hidden Webcam */}
      <Webcam ref={webcamRef} audio={false} className="hidden" mirrored />

      {/* Canvas */}
      <div className="bg-black p-4 rounded-[30px] shadow-2xl">
        <canvas ref={canvasRef} className="rounded-[20px] w-[700px] max-w-full" />
      </div>

      {/* Countdown */}
      <div className={`text-7xl font-bold mt-8 h-24 ${isDark ? "text-white" : "text-black"}`}>{countdown}</div>

      {/* Start Button */}
      <button onClick={startCapture} disabled={isCapturing} className={`mt-6 px-8 py-4 rounded-2xl text-xl hover:scale-105 duration-300 disabled:opacity-50 ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
        {isCapturing ? "Sedang Foto..." : "Start Photobooth"}
      </button>

      {/* Back */}
      <button
        onClick={() => {
          setSelectedTemplate(null);

          setPhotos([]);

          setStrip(null);

          setCountdown(null);

          setIsCapturing(false);
        }}
        className={`mt-4 underline ${isDark ? "text-white" : "text-black"}`}
      >
        Ganti Template
      </button>

      {/* Preview */}
      <div className="flex flex-wrap gap-4 justify-center mt-10">
        {photos.map((photo, index) => (
          <img key={index} src={photo} alt="" className="w-40 rounded-2xl shadow-xl" />
        ))}
      </div>

      {/* Strip */}
      {strip && (
        <div className="mt-14 flex flex-col items-center">
          <h2 className={`text-3xl font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>Hasil Photostrip</h2>

          <img src={strip} alt="strip" className="w-[280px] rounded-2xl shadow-2xl" />

          <a href={strip} download="photobooth.png" className={`mt-6 px-8 py-4 rounded-2xl hover:scale-105 duration-300 ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
            Download
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
