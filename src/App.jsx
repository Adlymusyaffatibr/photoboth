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
  const faceBoxHistory = useRef([]);
  const particlesRef = useRef([]);
  const lastCanvasSize = useRef({ width: 0, height: 0 });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEffect, setSelectedEffect] = useState("none");
  const [magicEffect, setMagicEffect] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [strip, setStrip] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [waitingRetake, setWaitingRetake] = useState(false);
  const retakeResolver = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hatLoaded, setHatLoaded] = useState(false);
  const [hatDimensions, setHatDimensions] = useState({ width: 340, height: 180 });
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    color: "#ffffff",
    frameColor: "#d9d9d9",
    accentColor: "#bbbbbb",
    bannerTop: "CUSTOM TEMPLATE",
    bannerBottom: "CREATE YOUR OWN",
    ornamentTL: "✨",
    ornamentTR: "✨",
    ornamentBL: "✨",
    ornamentBR: "✨",
    ornamentTLImage: null, // base64 atau null
    ornamentTRImage: null,
    ornamentBLImage: null,
    ornamentBRImage: null,
    magicEmoji: "✨",
    previewImage: null,
  });

  // Reset partikel saat template berganti
  useEffect(() => {
    particlesRef.current = [];
    lastCanvasSize.current = { width: 0, height: 0 };
  }, [selectedTemplate]);

  useEffect(() => {
    if (magicEffect) {
      particlesRef.current = [];
      lastCanvasSize.current = { width: 0, height: 0 };
    }
  }, [magicEffect]);

  useEffect(() => {
    selectedEffectRef.current = selectedEffect;
  }, [selectedEffect]);

  // Load template default & custom dari localStorage
  useEffect(() => {
    const defaultTemplates = [
      {
        id: "default-white",
        name: "White",
        color: "#ffffff",
        frameColor: "#d9d9d9",
        accentColor: "#bbbbbb",
        bannerTop: "☁️ PURE DREAM ☁️",
        bannerBottom: "☀️ CLOUDY SKY ☀️",
        ornamentTL: "☁️",
        ornamentTR: "☀️",
        ornamentBL: "🤍",
        ornamentBR: "☁️",
        ornamentTLImage: null,
        ornamentTRImage: null,
        ornamentBLImage: null,
        ornamentBRImage: null,
        magicEmoji: "☁️",
        isCustom: false,
        previewImage: null,
      },
      {
        id: "default-black",
        name: "Black",
        color: "#000000",
        frameColor: "#ffffff",
        accentColor: "#888888",
        bannerTop: "🖤 DARK NIGHT 🖤",
        bannerBottom: "🦇 MOONLIGHT 🦇",
        ornamentTL: "🦇",
        ornamentTR: "🌙",
        ornamentBL: "🖤",
        ornamentBR: "🦇",
        ornamentTLImage: null,
        ornamentTRImage: null,
        ornamentBLImage: null,
        ornamentBRImage: null,
        magicEmoji: "🦇",
        isCustom: false,
        previewImage: null,
      },
      {
        id: "default-pink",
        name: "Pink",
        color: "#ffc0cb",
        frameColor: "#ff4fa3",
        accentColor: "#ff1493",
        bannerTop: "🧸 ☁️ LOVE ☁️ 🧸",
        bannerBottom: "☁️ 💖 SWEET DAY 💖 ☁️",
        ornamentTL: "☁️",
        ornamentTR: "🧸",
        ornamentBL: "💖",
        ornamentBR: "☁️",
        ornamentTLImage: null,
        ornamentTRImage: null,
        ornamentBLImage: null,
        ornamentBRImage: null,
        magicEmoji: "🦋",
        isCustom: false,
        previewImage: null,
      },
    ];

    const savedCustom = localStorage.getItem("photobooth_custom_templates");
    let customTemplates = [];
    if (savedCustom) {
      try {
        customTemplates = JSON.parse(savedCustom);
      } catch (e) {}
    }
    setTemplates([...defaultTemplates, ...customTemplates]);
  }, []);

  // Simpan template custom ke localStorage
  useEffect(() => {
    const customTemplates = templates.filter((t) => t.isCustom);
    localStorage.setItem("photobooth_custom_templates", JSON.stringify(customTemplates));
  }, [templates]);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForRetakeDecision = () => {
    return new Promise((resolve) => {
      retakeResolver.current = resolve;
    });
  };

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

  const getSmoothedFaceBox = (newBox) => {
    const historySize = 5;
    faceBoxHistory.current.push(newBox);
    if (faceBoxHistory.current.length > historySize) faceBoxHistory.current.shift();
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
  };

  const cowboyHat = new Image();
  cowboyHat.src = "/cowboy-hat.png";

  // Fungsi helper untuk menggambar ornament (teks atau gambar)
  const drawOrnament = (ctx, x, y, textOrEmoji, imageBase64, defaultSize = 42) => {
    if (imageBase64) {
      const img = new Image();
      img.src = imageBase64;
      if (img.complete) {
        // Gambar dengan lebar tetap 70px, tinggi proporsional
        const targetWidth = 70;
        const ratio = img.height / img.width;
        const targetHeight = targetWidth * ratio;
        ctx.drawImage(img, x - targetWidth / 2, y - targetHeight / 2, targetWidth, targetHeight);
      } else {
        img.onload = () => {
          const targetWidth = 70;
          const ratio = img.height / img.width;
          const targetHeight = targetWidth * ratio;
          ctx.drawImage(img, x - targetWidth / 2, y - targetHeight / 2, targetWidth, targetHeight);
        };
        // Fallback: jika belum load, tulis teks sementara
        ctx.font = `${defaultSize}px "Segoe UI Emoji"`;
        ctx.fillText(textOrEmoji, x - defaultSize / 2, y + defaultSize / 3);
      }
    } else {
      ctx.font = `${defaultSize}px "Segoe UI Emoji"`;
      ctx.fillText(textOrEmoji, x - defaultSize / 2, y + defaultSize / 3);
    }
  };

  const drawFrameOnPhoto = (ctx, width, height, template) => {
    ctx.clearRect(0, 0, width, height);
    const isDark = template.color === "#000000";
    const frameColor = template.frameColor;
    const accentColor = template.accentColor;

    ctx.save();

    // Gambar video flip horizontal
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamRef.current.video, 0, 0, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Magic particles
    if (magicEffect) {
      if (particlesRef.current.length === 0 || lastCanvasSize.current.width !== width || lastCanvasSize.current.height !== height) {
        const emoji = template.magicEmoji || "✨";
        particlesRef.current = createParticles(emoji, width, height);
        lastCanvasSize.current = { width, height };
      }
      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
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
    } else {
      particlesRef.current = [];
      lastCanvasSize.current = { width: 0, height: 0 };
    }

    // Cowboy hat effect
    if (selectedEffectRef.current === "cowboy" && modelsLoaded && hatLoaded && faceBoxRef.current) {
      const faceBox = faceBoxRef.current;
      const faceWidth = faceBox.width;
      const hatWidth = faceWidth * 1.5;
      const hatHeight = hatWidth * (hatDimensions.height / hatDimensions.width);
      const hatX = width - (faceBox.x + faceBox.width / 2) - hatWidth / 2;
      const overlapFactor = 0.1;
      const hatY = faceBox.y - hatHeight * (1 - overlapFactor);
      ctx.drawImage(cowboyHat, hatX, hatY, hatWidth, hatHeight);
    }

    // Borders
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
    ctx.fillText(template.bannerTop, width / 2, 52);

    // Bottom banner
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, height - 80, width, 80);
    ctx.font = 'bold 34px "Arial"';
    ctx.fillStyle = isDark ? "#000000" : "#ffffff";
    ctx.fillText(template.bannerBottom, width / 2, height - 28);

    // Side ornaments (mendukung gambar custom)
    ctx.textAlign = "center";
    ctx.fillStyle = isDark ? "#000000" : "#ffffff";
    // Posisi masing-masing ornament: (x, y) sesuai koordinat asli
    drawOrnament(ctx, 55, 170, template.ornamentTL, template.ornamentTLImage, 42);
    drawOrnament(ctx, width - 55, 250, template.ornamentTR, template.ornamentTRImage, 42);
    drawOrnament(ctx, 55, height - 220, template.ornamentBL, template.ornamentBLImage, 42);
    drawOrnament(ctx, width - 55, height - 140, template.ornamentBR, template.ornamentBRImage, 42);

    ctx.restore();
  };

  // Live preview
  useEffect(() => {
    if (!selectedTemplate || !webcamRef.current || !canvasRef.current) return;
    const video = webcamRef.current.video;
    if (!video) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let lastWidth = 0,
      lastHeight = 0;
    let isActive = true;

    const draw = () => {
      if (!isActive) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const { videoWidth, videoHeight } = video;
        if (videoWidth !== lastWidth || videoHeight !== lastHeight) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          lastWidth = videoWidth;
          lastHeight = videoHeight;
        }
        if (modelsLoaded && frameCounter.current % 3 === 0) {
          detectFace().catch(console.error);
        }
        frameCounter.current++;
        drawFrameOnPhoto(ctx, canvas.width, canvas.height, selectedTemplate);
      }
      if (isActive) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      isActive = false;
      cancelAnimationFrame(animationRef.current);
    };
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
      let accepted = false;

      while (!accepted) {
        // countdown
        for (let c = 3; c > 0; c--) {
          setCountdown(c);
          await wait(1000);
        }

        setCountdown("📸");
        await wait(700);

        const image = captureWithFrame();

        setCountdown(null);

        // tampilkan preview
        setCurrentPhoto(image);
        setWaitingRetake(true);

        // tunggu keputusan user
        const decision = await waitForRetakeDecision();

        if (decision === "accept") {
          capturedPhotos.push(image);
          setPhotos([...capturedPhotos]);
          accepted = true;
        }
      }
    }

    setCurrentPhoto(null);
    setWaitingRetake(false);

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

  // Handler upload gambar ornament
  const handleOrnamentImageUpload = (position, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTemplate((prev) => ({ ...prev, [position]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addCustomTemplate = () => {
    if (!newTemplate.name.trim()) {
      alert("Nama template harus diisi!");
      return;
    }
    const customId = "custom-" + Date.now();
    const templateToAdd = {
      id: customId,
      name: newTemplate.name,
      color: newTemplate.color,
      frameColor: newTemplate.frameColor,
      accentColor: newTemplate.accentColor,
      bannerTop: newTemplate.bannerTop,
      bannerBottom: newTemplate.bannerBottom,
      ornamentTL: newTemplate.ornamentTL || "✨",
      ornamentTR: newTemplate.ornamentTR || "✨",
      ornamentBL: newTemplate.ornamentBL || "✨",
      ornamentBR: newTemplate.ornamentBR || "✨",
      ornamentTLImage: newTemplate.ornamentTLImage || null,
      ornamentTRImage: newTemplate.ornamentTRImage || null,
      ornamentBLImage: newTemplate.ornamentBLImage || null,
      ornamentBRImage: newTemplate.ornamentBRImage || null,
      magicEmoji: newTemplate.magicEmoji || "✨",
      isCustom: true,
      previewImage: newTemplate.previewImage,
    };
    setTemplates((prev) => [...prev, templateToAdd]);
    setShowTemplateModal(false);
    setNewTemplate({
      name: "",
      color: "#ffffff",
      frameColor: "#d9d9d9",
      accentColor: "#bbbbbb",
      bannerTop: "CUSTOM TEMPLATE",
      bannerBottom: "CREATE YOUR OWN",
      ornamentTL: "✨",
      ornamentTR: "✨",
      ornamentBL: "✨",
      ornamentBR: "✨",
      ornamentTLImage: null,
      ornamentTRImage: null,
      ornamentBLImage: null,
      ornamentBRImage: null,
      magicEmoji: "✨",
      previewImage: null,
    });
  };

  const handlePreviewImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTemplate({ ...newTemplate, previewImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Template selection page
  if (!selectedTemplate) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-6 py-10">
        <h1 className="text-5xl font-bold text-center">Photobooth</h1>
        <p className="text-center text-zinc-400 mt-3">Pilih template favorit kamu 📸</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-14 max-w-6xl mx-auto">
          {templates.map((template) => (
            <div key={template.id} onClick={() => setSelectedTemplate(template)} className="cursor-pointer hover:scale-105 duration-300">
              <div
                className="w-[260px] rounded-[35px] p-5 shadow-2xl border-[6px]"
                style={{
                  background: template.color,
                  borderColor: template.frameColor,
                }}
              >
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative h-[120px] overflow-hidden rounded-2xl" style={{ border: `4px solid ${template.accentColor}` }}>
                      {template.previewImage ? <img src={template.previewImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">Preview</div>}
                      <div className="absolute inset-2 border-2 border-dashed rounded-xl" style={{ borderColor: template.accentColor }} />
                      <div className="absolute top-0 left-0 w-full py-1 text-center text-[11px] font-bold" style={{ background: template.frameColor, color: template.color === "#000000" ? "black" : "white" }}>
                        {template.bannerTop.length > 20 ? template.bannerTop.slice(0, 20) + ".." : template.bannerTop}
                      </div>
                      <div className="absolute bottom-0 left-0 w-full py-1 text-center text-[11px] font-bold" style={{ background: template.frameColor, color: template.color === "#000000" ? "black" : "white" }}>
                        {template.bannerBottom.length > 20 ? template.bannerBottom.slice(0, 20) + ".." : template.bannerBottom}
                      </div>
                      <div className="absolute left-1 top-8 text-sm">{template.ornamentTL}</div>
                      <div className="absolute right-1 top-12 text-sm">{template.ornamentTR}</div>
                      <div className="absolute left-1 bottom-8 text-sm">{template.ornamentBL}</div>
                      <div className="absolute right-1 bottom-8 text-sm">{template.ornamentBR}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-center">
                  <h2 className={`text-2xl font-bold ${template.color === "#000000" ? "text-white" : "text-black"}`}>{template.name}</h2>
                  <p className={`text-sm mt-1 ${template.color === "#000000" ? "text-zinc-300" : "text-zinc-600"}`}>Magic: {template.magicEmoji || "✨"}</p>
                </div>
              </div>
            </div>
          ))}
          {/* Tombol tambah template */}
          <div onClick={() => setShowTemplateModal(true)} className="cursor-pointer hover:scale-105 duration-300">
            <div className="w-[260px] rounded-[35px] p-5 shadow-2xl border-[6px] border-dashed border-zinc-500 bg-zinc-800 flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="text-6xl mb-3">➕</div>
              <h2 className="text-xl font-bold">Buat Template</h2>
              <p className="text-sm text-zinc-400 text-center mt-2">Tambahkan template kustom sendiri</p>
            </div>
          </div>
        </div>

        {/* Modal Tambah Template dengan upload gambar ornament */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white text-black rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Tambah Template Kustom</h2>
              <div className="space-y-3">
                <input type="text" placeholder="Nama Template" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} className="w-full border rounded-xl p-2" />
                <div className="flex gap-2">
                  <div>
                    <label className="block text-sm">Warna Latar</label>
                    <input type="color" value={newTemplate.color} onChange={(e) => setNewTemplate({ ...newTemplate, color: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm">Warna Bingkai</label>
                    <input type="color" value={newTemplate.frameColor} onChange={(e) => setNewTemplate({ ...newTemplate, frameColor: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm">Warna Aksen</label>
                    <input type="color" value={newTemplate.accentColor} onChange={(e) => setNewTemplate({ ...newTemplate, accentColor: e.target.value })} />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Banner Atas (contoh: ☁️ PURE DREAM ☁️)"
                  value={newTemplate.bannerTop}
                  onChange={(e) => setNewTemplate({ ...newTemplate, bannerTop: e.target.value })}
                  className="w-full border rounded-xl p-2"
                />
                <input type="text" placeholder="Banner Bawah" value={newTemplate.bannerBottom} onChange={(e) => setNewTemplate({ ...newTemplate, bannerBottom: e.target.value })} className="w-full border rounded-xl p-2" />

                {/* Ornamen teks */}
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Ornamen Kiri Atas (teks)" value={newTemplate.ornamentTL} onChange={(e) => setNewTemplate({ ...newTemplate, ornamentTL: e.target.value })} className="border rounded-xl p-2" />
                  <input type="text" placeholder="Ornamen Kanan Atas (teks)" value={newTemplate.ornamentTR} onChange={(e) => setNewTemplate({ ...newTemplate, ornamentTR: e.target.value })} className="border rounded-xl p-2" />
                  <input type="text" placeholder="Ornamen Kiri Bawah (teks)" value={newTemplate.ornamentBL} onChange={(e) => setNewTemplate({ ...newTemplate, ornamentBL: e.target.value })} className="border rounded-xl p-2" />
                  <input type="text" placeholder="Ornamen Kanan Bawah (teks)" value={newTemplate.ornamentBR} onChange={(e) => setNewTemplate({ ...newTemplate, ornamentBR: e.target.value })} className="border rounded-xl p-2" />
                </div>

                {/* Upload gambar untuk masing-masing ornament */}
                <div className="border-t pt-2">
                  <p className="font-semibold text-sm mb-1">Hiasan Gambar (opsional, gantikan teks)</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label>Kiri Atas:</label>
                      <input type="file" accept="image/*" onChange={(e) => handleOrnamentImageUpload("ornamentTLImage", e.target.files[0])} />
                      {newTemplate.ornamentTLImage && <img src={newTemplate.ornamentTLImage} alt="preview" className="w-10 h-10 object-cover mt-1 rounded" />}
                    </div>
                    <div>
                      <label>Kanan Atas:</label>
                      <input type="file" accept="image/*" onChange={(e) => handleOrnamentImageUpload("ornamentTRImage", e.target.files[0])} />
                      {newTemplate.ornamentTRImage && <img src={newTemplate.ornamentTRImage} alt="preview" className="w-10 h-10 object-cover mt-1 rounded" />}
                    </div>
                    <div>
                      <label>Kiri Bawah:</label>
                      <input type="file" accept="image/*" onChange={(e) => handleOrnamentImageUpload("ornamentBLImage", e.target.files[0])} />
                      {newTemplate.ornamentBLImage && <img src={newTemplate.ornamentBLImage} alt="preview" className="w-10 h-10 object-cover mt-1 rounded" />}
                    </div>
                    <div>
                      <label>Kanan Bawah:</label>
                      <input type="file" accept="image/*" onChange={(e) => handleOrnamentImageUpload("ornamentBRImage", e.target.files[0])} />
                      {newTemplate.ornamentBRImage && <img src={newTemplate.ornamentBRImage} alt="preview" className="w-10 h-10 object-cover mt-1 rounded" />}
                    </div>
                  </div>
                </div>

                {/* Magic emoji */}
                <div>
                  <label className="block text-sm">Emoji Efek Magic ✨</label>
                  <input type="text" placeholder="Contoh: 🦋, 🦇, ☁️, ❄️, 🌟" value={newTemplate.magicEmoji} onChange={(e) => setNewTemplate({ ...newTemplate, magicEmoji: e.target.value })} className="w-full border rounded-xl p-2" />
                </div>

                {/* Preview gambar template (thumbnail) */}
                <div>
                  <label className="block text-sm">Gambar Preview (opsional)</label>
                  <input type="file" accept="image/*" onChange={handlePreviewImageUpload} className="w-full" />
                  {newTemplate.previewImage && <img src={newTemplate.previewImage} alt="preview" className="mt-2 w-32 h-32 object-cover rounded" />}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={addCustomTemplate} className="bg-pink-500 text-white px-4 py-2 rounded-xl flex-1">
                  Simpan
                </button>
                <button onClick={() => setShowTemplateModal(false)} className="bg-gray-300 px-4 py-2 rounded-xl flex-1">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isDark = selectedTemplate.color === "#000000";

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10" style={{ background: selectedTemplate.color }}>
      <h1 className={`text-5xl font-bold mb-8 ${isDark ? "text-white" : "text-black"}`}>Photobooth 📸</h1>
      {!modelsLoaded && <div className="text-center mb-4 text-yellow-500 font-bold">Loading face detection...</div>}
      <Webcam ref={webcamRef} audio={false} style={{ position: "fixed", top: "-100vh", left: "-100vw", opacity: 0, pointerEvents: "none" }} />
      <div className="relative bg-black p-4 rounded-[30px] shadow-2xl">
        <canvas ref={canvasRef} className="rounded-[20px] w-[700px] max-w-full" />
        {countdown && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-8xl font-bold drop-shadow-2xl text-white">{countdown}</div>
          </div>
        )}
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
      {waitingRetake && currentPhoto && (
        <div className="mt-8 flex flex-col items-center">
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-black"}`}>Preview Foto</h2>

          <img src={currentPhoto} alt="preview" className="w-64 rounded-2xl shadow-2xl" />

          <div className="flex gap-4 mt-5">
            <button
              onClick={() => {
                setWaitingRetake(false);
                retakeResolver.current("retake");
              }}
              className="bg-red-500 text-white px-6 py-3 rounded-xl"
            >
              🔄 Retake
            </button>

            <button
              onClick={() => {
                setWaitingRetake(false);
                retakeResolver.current("accept");
              }}
              className="bg-green-500 text-white px-6 py-3 rounded-xl"
            >
              ✅ Pakai
            </button>
          </div>
        </div>
      )}
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
