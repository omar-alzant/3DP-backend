// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const ObjFileParser = require('obj-file-parser');
const materialRoutes = require('./routes/materialRoutes');
const AuthRoutes = require('./routes/AuthRoutes');
const BenefitsRoutes = require('./routes/BenefitsRoutes');
const mailRoutes = require('./routes/mailRoutes');
const authMiddleware = require('./middleware/auth');
const loggerSupa = require("./config/loggerSupabase");


// const StripeRoutes = require('./routes/StripeRoutes');
// const multer = require('multer');

const { measureVolume } = require('@jscad/modeling').measurements;
const { serialize } = require('@jscad/stl-serializer');

// const { generateOutput } = require('@jscad/openjscad');

require('dotenv').config();

// const { OpenAI } = require('openai');
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

const app = express();
const allowedOrigins = [
  /^https:\/\/3-dp-frontend.*\.vercel\.app$/, // all preview deploys
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow REST clients
    if (allowedOrigins.some(o => o instanceof RegExp ? o.test(origin) : o === origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use('/admin/materials', materialRoutes);
app.use('/supabase', AuthRoutes);

app.use('/benefits', BenefitsRoutes);
app.use('/mail', mailRoutes);
// app.use('/Stripe', StripeRoutes);



const axios = require('axios');

app.post('/threeDMaker',authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY}` };
  const userId = req.userId;

  try {
    // إرسال الطلب لإنشاء المهمة
    const { data } = await axios.post(
      'https://api.meshy.ai/openapi/v2/text-to-3d',
      {
        mode: 'preview',
        prompt,
        art_style: 'realistic',
        should_remesh: true
      },
      { headers }
    );

    const taskId = data?.result || data?.task_id;
    if (!taskId) {
      loggerSupa('threeDMaker.Error', 'No taskId returned from Meshy API', userId);
      throw new Error('No taskId returned from Meshy API');}

    // نرجع الـ taskId للمستخدم
    res.json({ taskId });
  } catch (err) {
    loggerSupa('threeDMaker.Error', `Error creating Meshy task: ${err?.response?.data || err}`, userId);
    console.error('Error creating Meshy task:', err?.response?.data || err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/threeDMaker/remesh', authMiddleware, async (req, res) => {
  const { TaskId } = req.body;
  const userId = req.userId;
  const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY}` };
  const payload = {
      input_task_id: TaskId,
      target_formats: ["stl"],
      topology: "quad",
      target_polycount: 50000,
      origin_at: "center"
  };
  try {
    // إرسال الطلب لإنشاء المهمة
    const resp = await axios.post(
          'https://api.meshy.ai/openapi/v1/remesh',
          payload,
        { headers }
      );

    if (!resp.data) {
      loggerSupa('threeDMaker/remish.Error', `No taskId returned from Meshy API`, userId);
      throw new Error('No taskId returned from Meshy API');}

    // نرجع الـ taskId للمستخدم
    res.json({ data: resp.data });
  } catch (err) {
    loggerSupa('threeDMaker.Error', `Error creating Remesh task: ${err?.response?.data || err}`, userId);
    console.error('Error creating Remesh task:', err?.response?.data || err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/threeDMaker/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY}` };
  const userId = req.userId;

  try {
    const { data } = await axios.get(
      `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`,
      { headers }
    );
    
    loggerSupa(`threeDMaker/${taskId}.Info`, `Get task id from meshy done!`, userId);
    res.json(data);
  } catch (err) {
    loggerSupa(`threeDMaker/${taskId}.Error`, `Error fetching Meshy task result: ${err?.response?.data || err}`, userId);
    console.error('Error fetching Meshy task result:', err?.response?.data || err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/threeDMaker/remesh/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY}` };
  const userId = req.userId;

  try {
    const { data } = await axios.get(
      `https://api.meshy.ai/openapi/v1/remesh/${taskId}`,
      { headers }
    );

    loggerSupa(`threeDMaker/remish/${taskId}.Info`, `Get task id from remish done!`, userId);
    res.json(data);
  } catch (err) {
    loggerSupa(`threeDMaker/remish/${taskId}.Error`, `Error fetching Meshy task result: ${err?.response?.data || err}`, userId);
    console.error('Error fetching Meshy task result:', err?.response?.data || err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/openaiUploads', express.static(path.join(__dirname, 'openaiUploads')));
const crypto = require('crypto');

// Helper function to extract code between //* and *// markers
function extractCodeBetweenMarkers(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // First try to extract code between //* and *// markers
  const codeMatch = content.match(/\/\/\*([\s\S]*?)\*\/\//);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].trim();
  }
  
  // Fallback: try to extract code between /* and */ (standard comment format)
  // const fallbackMatch = content.match(/\/\*([\s\S]*?)\*\//);
  // if (fallbackMatch && fallbackMatch[1]) {
  //   return fallbackMatch[1].trim();
  // }
  
  // If no markers found, use the entire content but clean markdown
  return 'No Code with //* ... *//';
  // return content.replace(/```openscad\n?|\n?```/g, '').trim();
}

app.post('/openai', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const userId = req.userId;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // use a valid model like 'gpt-4' or 'gpt-3.5-turbo'
      messages: [
        {
          role: 'user',
          content: `${prompt}. please make the openscad between //* ... *// and return the code value only`,
        },
      ],
      temperature: 1,
    });

    const content = response.choices[0].message.content;

    // Extract code between //* and *// markers
    let code = extractCodeBetweenMarkers(content);
    
    console.log("CODE: 🚀 ", code);
    
    // Check if code was successfully extracted
    if (!code || code.trim() === '') {
      console.error('❌ No code extracted from response');
      return res.status(400).json({ error: 'No valid code found in response' });
    }
    
    // Generate unique filenames
    const id = crypto.randomUUID();
    const stlFilename = `model-${id}.stl`;

    
    // Convert to STL
    const stlPath = path.join(__dirname, 'openaiUploads', stlFilename);

    await convertToSTL(code, stlPath)

    console.log(`✅ STL generated: ${stlFilename}`);

    res.json({
      code,
      stlFile: `/openaiUploads/${stlFilename}`, // you can serve this as static
    });
  } catch (error) {
    console.error('❌ Error calling OpenAI:', error);
    res.status(500).json({ error: code });
  }
});

async function convertToSTL(code, filename) {
  try {
    // Clean the code - remove any remaining markdown formatting or markers
    let cleanCode = code.replace(/```openscad\n?|\n?```/g, '').trim();
    
    // Also remove any remaining //* and *// markers if they exist
    cleanCode = cleanCode.replace(/\/\/\*|\*\/\//g, '').trim();
    
    console.log('🔧 Processing JSCAD code:', cleanCode.substring(0, 100) + '...');

    // Step 1: Parse the OpenJSCAD code and create geometries
    const { primitives, booleans, transforms } = require('@jscad/modeling');
    
    // Simple parser for basic OpenJSCAD operations
    const geometries = parseOpenJSCADCode(cleanCode, { primitives, booleans, transforms });
    
    if (!geometries || geometries.length === 0) {
      throw new Error('No geometries generated from the code');
    }

    console.log(`📊 Generated ${geometries.length} geometries`);

    // Step 2: Serialize to STL
    const stlData = serialize({ binary: false }, geometries);

    if (!stlData || stlData.length === 0) {
      throw new Error('Failed to serialize geometries to STL');
    }

    // Step 3: Write to file
    fs.writeFileSync(filename, stlData[0]);

    console.log(`✅ STL saved to ${filename}`);
  } catch (error) {
    // console.error('❌ Error converting to STL:', error);
    throw error;
  }
}

function computeNormal(v1, v2, v3) {
  const U = {
    x: v2.x - v1.x,
    y: v2.y - v1.y,
    z: v2.z - v1.z,
  };
  const V = {
    x: v3.x - v1.x,
    y: v3.y - v1.y,
    z: v3.z - v1.z,
  };
  const Nx = U.y * V.z - U.z * V.y;
  const Ny = U.z * V.x - U.x * V.z;
  const Nz = U.x * V.y - U.y * V.x;

  const length = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz);
  if (length === 0) return { x: 0, y: 0, z: 0 };

  return { x: Nx / length, y: Ny / length, z: Nz / length };
}

const fsp = require('fs').promises;

async function Obj2STL(objPath) {
  try {
    const objContent = await fsp.readFile(objPath, 'utf8'); // 🔄 Async file read
    const objData = new ObjFileParser(objContent).parse();
    const faces = objData.models[0].faces;
    const vertices = objData.models[0].vertices;

    let stl = 'solid obj\n';
    for (const face of faces) {
      const v1 = vertices[face.vertices[0].vertexIndex - 1];
      const v2 = vertices[face.vertices[1].vertexIndex - 1];
      const v3 = vertices[face.vertices[2].vertexIndex - 1];
      const normal = computeNormal(v1, v2, v3);
      stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}
    outer loop
      vertex ${v1.x} ${v1.y} ${v1.z}
      vertex ${v2.x} ${v2.y} ${v2.z}
      vertex ${v3.x} ${v3.y} ${v3.z}
    endloop
  endfacet\n`;
    }
    stl += 'endsolid obj';

    return stl;
  } catch (err) {
    console.error('Error reading or parsing OBJ file:', err);
    throw err;
  }
}

function parseOpenJSCADCode(code, { primitives, booleans, transforms }) {
  const geometries = [];
  
  // Simple regex patterns for basic OpenJSCAD operations
  const cubePattern = /cube\s*\(\s*\[?\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]?\s*\)/g;
  const cylinderPattern = /cylinder\s*\(\s*h\s*=\s*([0-9.]+)\s*,\s*r\s*=\s*([0-9.]+)\s*\)/g;
  const spherePattern = /sphere\s*\(\s*r\s*=\s*([0-9.]+)\s*\)/g;
  const simpleCubePattern = /cube\s*\(\s*([0-9.]+)\s*\)/g;
  
  let match;
  
  // Parse cubes with dimensions [x, y, z]
  while ((match = cubePattern.exec(code)) !== null) {
    const [_, x, y, z] = match;
    // Use the largest dimension as the size for a cube
    const size = Math.max(parseFloat(x), parseFloat(y), parseFloat(z));
    const cube = primitives.cube({ size });
    geometries.push(cube);
  }
  
  // Parse simple cubes with single size
  while ((match = simpleCubePattern.exec(code)) !== null) {
    const [_, size] = match;
    const cube = primitives.cube({ size: parseFloat(size) });
    geometries.push(cube);
  }
  
  // Parse cylinders
  while ((match = cylinderPattern.exec(code)) !== null) {
    const [_, h, r] = match;
    const cylinder = primitives.cylinder({ height: parseFloat(h), radius: parseFloat(r) });
    geometries.push(cylinder);
  }
  
  // Parse spheres
  while ((match = spherePattern.exec(code)) !== null) {
    const [_, r] = match;
    const sphere = primitives.sphere({ radius: parseFloat(r) });
    geometries.push(sphere);
  }
  
  // If no geometries found, create a default cube
  if (geometries.length === 0) {
    const defaultCube = primitives.cube({ size: 10 });
    geometries.push(defaultCube);
  }
  
  return geometries;
}

app.use('/files', express.static('uploads'));

app.post('/upload', authMiddleware, async (req, res) => {
  let buffer = req.body;
  const id = req.query.id;
  const userId = req.userId;
  const filename = req.headers['x-filename'] || 'model.stl';
  // const filenameWithoutType = filename.substring(0, filename.lastIndexOf('.'));

  const uploadingDir = path.join("uploads", id); // نسبي فقط

  if (!fs.existsSync(path.join(__dirname, uploadingDir))) {
    fs.mkdirSync(path.join(__dirname, uploadingDir), { recursive: true });
  }
  
  const savePath = path.join(__dirname, uploadingDir, filename);
  fs.writeFileSync(savePath, buffer);
  

  const stlDeserializer = require('@jscad/stl-deserializer');
  const rawData = fs.readFileSync(savePath);
  const geometry = stlDeserializer.deserialize({ output: 'geometry', filename }, rawData);

  if (!geometry || geometry.length === 0) {
    loggerSupa(`upload.Error`, `❌ STL parsing resulted in empty objects!`, userId);
    console.error("❌ STL parsing resulted in empty objects!");
    return res.status(400).json({ error: "ملف STL غير صالح أو فارغ" });
  }

  try {
    const volumeMm3 = measureVolume(geometry[0]);
    const volumeCm3 = volumeMm3 / 1000;
    
    // const price = (volumeCm3 * 0.10).toFixed(2);
    loggerSupa(`upload.Info`, `STL parsing Done!`, userId);
    res.json({ volume: volumeCm3.toFixed(2), fileName: filename});
  } catch (e) {
    loggerSupa(`upload.Error`, `❌ Error while measuring volume`, userId);
    console.error("❌ Error while measuring volume", e);
    res.status(500).json({ error: "فشل حساب حجم STL" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


