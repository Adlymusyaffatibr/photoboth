import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const frameCounter = useRef(0);
  const faceBoxRef = useRef(null);
  const selectedEffectRef = useRef("none");
  const faceBoxHistory = useRef([]); // untuk smoothing
  const particlesRef = useRef([]);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEffect, setSelectedEffect] = useState("none");
  const [magicEffect, setMagicEffect] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [strip, setStrip] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hatLoaded, setHatLoaded] = useState(false);
  const [hatDimensions, setHatDimensions] = useState({ width: 340, height: 180 });

  // Sync ref dengan state selectedEffect
  useEffect(() => {
    selectedEffectRef.current = selectedEffect;
  }, [selectedEffect]);

  const templates = [
    { id: 1, name: "White", color: "#ffffff", preview: "bg-white" },
    { id: 2, name: "Black", color: "#000000", preview: "bg-black" },
    { id: 3, name: "Pink", color: "#ffc0cb", preview: "bg-pink-300" },
  ];

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const createParticles = (type, width, height) => {
    const particles = [];

    for (let i = 0; i < 15; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 20 + 20,
        speedX: (Math.random() - 0.5) * 2,
        speedY: Math.random() * 1 + 0.5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2,
        emoji: type,
      });
    }

    return particles;
  };

  // Load face detection model
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log("Face detection model loaded");
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  // Load gambar topi
  useEffect(() => {
    const hat = new Image();
    hat.onload = () => {
      setHatDimensions({ width: hat.width, height: hat.height });
      setHatLoaded(true);
    };
    hat.onerror = () => console.error("cowboy-hat.png not found in /public folder");
    hat.src = "/cowboy-hat.png";
  }, []);

  useEffect(() => {
    if (!selectedTemplate || !magicEffect) {
      particlesRef.current = [];
      return;
    }

    // jangan bikin ulang kalau sudah ada
    if (particlesRef.current.length > 0) return;

    let emoji = "✨";

    if (selectedTemplate.name === "Pink") {
      emoji = "🦋";
    }

    if (selectedTemplate.name === "Black") {
      emoji = "🦇";
    }

    if (selectedTemplate.name === "White") {
      emoji = "☁️";
    }

    particlesRef.current = createParticles(emoji, 700, 700);
  }, [selectedTemplate, magicEffect]);

  // Fungsi untuk menghaluskan bounding box
  const getSmoothedFaceBox = (newBox) => {
    const historySize = 5;
    // tambahkan box baru ke history
    faceBoxHistory.current.push(newBox);
    if (faceBoxHistory.current.length > historySize) {
      faceBoxHistory.current.shift();
    }
    // hitung rata-rata
    const sum = faceBoxHistory.current.reduce(
      (acc, box) => {
        acc.x += box.x;
        acc.y += box.y;
        acc.width += box.width;
        acc.height += box.height;
        return acc;
      },
      { x: 0, y: 0, width: 0, height: 0 },
    );
    const len = faceBoxHistory.current.length;
    return {
      x: sum.x / len,
      y: sum.y / len,
      width: sum.width / len,
      height: sum.height / len,
    };
  };

  const detectFace = async () => {
    if (!webcamRef.current || !webcamRef.current.video) return;
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
    if (detection) {
      const rawBox = detection.box;
      const smoothedBox = getSmoothedFaceBox(rawBox);
      faceBoxRef.current = smoothedBox;
    }
    // Jika tidak ada deteksi, biarkan faceBoxRef.current tetap (tidak diubah)
  };

  const cowboyHat = new Image();
  cowboyHat.src = "/cowboy-hat.png";

  const drawFrameOnPhoto = (ctx, width, height, templateName) => {
    const isDark = templateName === "Black";
    const frameColor = templateName === "Pink" ? "#ff4fa3" : templateName === "Black" ? "#ffffff" : "#d9d9d9";
    const accentColor = templateName === "Pink" ? "#ff1493" : templateName === "Black" ? "#888888" : "#bbbbbb";

    ctx.save();
    ctx.drawImage(webcamRef.current.video, 0, 0, width, height);

    // MAGIC PARTICLES
    if (magicEffect) {
      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        // reset kalau keluar layar
        if (p.y > height + 50) {
          p.y = -50;
          p.x = Math.random() * width;
        }

        if (p.x > width + 50) p.x = -50;
        if (p.x < -50) p.x = width + 50;

        ctx.save();

        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        ctx.font = `${p.size}px Arial`;
        ctx.globalAlpha = 0.8;

        ctx.fillText(p.emoji, 0, 0);

        ctx.restore();
      });

      ctx.globalAlpha = 1;
    }

    // Gambar efek topi koboy dengan posisi yang stabil (hasil smoothing)
    if (selectedEffectRef.current === "cowboy" && modelsLoaded && hatLoaded && faceBoxRef.current) {
      const faceBox = faceBoxRef.current;
      const faceWidth = faceBox.width;
      const hatWidth = faceWidth * 1.5;
      const hatHeight = hatWidth * (hatDimensions.height / hatDimensions.width);
      const hatX = faceBox.x + faceBox.width / 2 - hatWidth / 2;

      // overlapFactor: 0.15 agar topi tidak terlalu nutupi dahi
      const overlapFactor = 0.1;
      const hatY = faceBox.y - hatHeight * (1 - overlapFactor);

      ctx.drawImage(cowboyHat, hatX, hatY, hatWidth, hatHeight);
    }

    // Borders, banner, ornaments (sama seperti kode asli)
    // ... (kode dari sini sampai akhir sama persis)

    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(25, 25, width - 50, height - 50);
    ctx.setLineDash([]);

    // Top banner
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, 0, width, 80);
    ctx.font = 'bold 42px "Arial"';
    ctx.textAlign = "center";
    ctx.fillStyle = isDark ? "#000000" : "#ffffff";

    if (templateName === "Pink") ctx.fillText("🧸 ☁️ LOVE ☁️ 🧸", width / 2, 52);
    if (templateName === "Black") ctx.fillText("🖤 DARK NIGHT 🖤", width / 2, 52);
    if (templateName === "White") ctx.fillText("☁️ PURE DREAM ☁️", width / 2, 52);

    // Bottom banner
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, height - 80, width, 80);
    ctx.font = 'bold 34px "Arial"';
    ctx.fillStyle = isDark ? "#000000" : "#ffffff";
    if (templateName === "Pink") ctx.fillText("☁️ 💖 SWEET DAY 💖 ☁️", width / 2, height - 28);
    if (templateName === "Black") ctx.fillText("🦇 MOONLIGHT 🦇", width / 2, height - 28);
    if (templateName === "White") ctx.fillText("☀️ CLOUDY SKY ☀️", width / 2, height - 28);

    // Side ornaments
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

  // LIVE PREVIEW – frekuensi deteksi lebih stabil (setiap 3 frame masih ok)
  useEffect(() => {
    if (!selectedTemplate || !webcamRef.current || !canvasRef.current) return;
    const video = webcamRef.current.video;
    if (!video) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let lastWidth = 0,
      lastHeight = 0;

    const draw = async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const { videoWidth, videoHeight } = video;
        if (videoWidth !== lastWidth || videoHeight !== lastHeight) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          lastWidth = videoWidth;
          lastHeight = videoHeight;
        }

        if (modelsLoaded && frameCounter.current % 3 === 0) {
          await detectFace();
        }
        frameCounter.current++;

        drawFrameOnPhoto(ctx, canvas.width, canvas.height, selectedTemplate.name);
      }
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [selectedTemplate, modelsLoaded, hatLoaded, hatDimensions, magicEffect]);

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

  const generateStrip = async (capturedPhotos) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = 430;
    const photoWidth = 350;
    const photoHeight = 250;
    const gap = 25;

    canvas.width = width;
    canvas.height = (photoHeight + gap) * 4 + 180;
    ctx.fillStyle = selectedTemplate.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < capturedPhotos.length; i++) {
      const img = new Image();
      img.src = capturedPhotos[i];
      await new Promise((resolve) => (img.onload = resolve));
      const y = 90 + i * (photoHeight + gap);
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 10;
      ctx.drawImage(img, 40, y, photoWidth, photoHeight);
      ctx.shadowBlur = 0;
    }
    setStrip(canvas.toDataURL("image/png"));
  };

  // Template selection page
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

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10" style={{ background: selectedTemplate.color }}>
      <h1 className={`text-5xl font-bold mb-8 ${isDark ? "text-white" : "text-black"}`}>Photobooth 📸</h1>

      {!modelsLoaded && <div className="text-center mb-4 text-yellow-500 font-bold">Loading face detection...</div>}

      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        style={{
          position: "fixed",
          top: "-100vh",
          left: "-100vw",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <div className="bg-black p-4 rounded-[30px] shadow-2xl">
        <canvas ref={canvasRef} className="rounded-[20px] w-[700px] max-w-full" />
      </div>

      <div className="flex gap-3 mt-6 flex-wrap justify-center">
        <button onClick={() => setSelectedEffect("none")} className={`px-5 py-2 rounded-xl font-semibold duration-300 ${selectedEffect === "none" ? "bg-pink-500 text-white" : "bg-white text-black"}`}>
          None
        </button>
        <button onClick={() => setSelectedEffect("cowboy")} className={`px-5 py-2 rounded-xl font-semibold duration-300 ${selectedEffect === "cowboy" ? "bg-pink-500 text-white" : "bg-white text-black"}`}>
          🤠 Cowboy
        </button>
        <button onClick={() => setMagicEffect(!magicEffect)} className={`px-5 py-2 rounded-xl font-semibold duration-300 ${magicEffect ? "bg-purple-500 text-white" : "bg-white text-black"}`}>
          ✨ Magic
        </button>
      </div>

      <div className={`text-7xl font-bold mt-8 h-24 ${isDark ? "text-white" : "text-black"}`}>{countdown}</div>

      <button onClick={startCapture} disabled={isCapturing} className={`mt-6 px-8 py-4 rounded-2xl text-xl hover:scale-105 duration-300 disabled:opacity-50 ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
        {isCapturing ? "Sedang Foto..." : "Start Photobooth"}
      </button>

      <button
        onClick={() => {
          setSelectedTemplate(null);
          setSelectedEffect("none");
          setPhotos([]);
          setStrip(null);
          setCountdown(null);
          setIsCapturing(false);
        }}
        className={`mt-4 underline ${isDark ? "text-white" : "text-black"}`}
      >
        Ganti Template
      </button>

      <div className="flex flex-wrap gap-4 justify-center mt-10">
        {photos.map((photo, index) => (
          <img key={index} src={photo} alt="" className="w-40 rounded-2xl shadow-xl" />
        ))}
      </div>

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
