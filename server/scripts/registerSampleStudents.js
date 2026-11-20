const https = require('https');
const http = require('http');

const STUDENTS = [
  { name: 'Aarav Patel', branch: 'ICT', rollNumber: '23BIT141', email: '23BIT141@pdpu.ac.in', password: 'Aarav@1234', semester: 5 },
  { name: 'Priya Shah', branch: 'ICT', rollNumber: '23BIT156', email: '23BIT156@pdpu.ac.in', password: 'Priya@1234', semester: 5 },
  { name: 'Rahul Mehta', branch: 'ICT', rollNumber: '23BIT172', email: '23BIT172@pdpu.ac.in', password: 'Rahul@1234', semester: 5 },
  { name: 'Arjun Desai', branch: 'Mechanical', rollNumber: '23BME183', email: '23BME183@pdpu.ac.in', password: 'Arjun@1234', semester: 5 },
  { name: 'Neha Joshi', branch: 'Mechanical', rollNumber: '23BME195', email: '23BME195@pdpu.ac.in', password: 'Neha@1234', semester: 5 },
  { name: 'Rohan Trivedi', branch: 'Mechanical', rollNumber: '23BME208', email: '23BME208@pdpu.ac.in', password: 'Rohan@1234', semester: 5 },
  { name: 'Krish Patel', branch: 'Electrical', rollNumber: '23BEE217', email: '23BEE217@pdpu.ac.in', password: 'Krish@1234', semester: 5 },
  { name: 'Ananya Shah', branch: 'Electrical', rollNumber: '23BEE229', email: '23BEE229@pdpu.ac.in', password: 'Ananya@1234', semester: 5 },
  { name: 'Dhruv Mehta', branch: 'Electrical', rollNumber: '23BEE236', email: '23BEE236@pdpu.ac.in', password: 'Dhruv@1234', semester: 5 },
  { name: 'Kavya Desai', branch: 'EC', rollNumber: '23BCE248', email: '23BCE248@pdpu.ac.in', password: 'Kavya@1234', semester: 5 },
  { name: 'Aditya Joshi', branch: 'EC', rollNumber: '23BCE259', email: '23BCE259@pdpu.ac.in', password: 'Aditya@1234', semester: 5 },
  { name: 'Diya Patel', branch: 'EC', rollNumber: '23BCE274', email: '23BCE274@pdpu.ac.in', password: 'Diya@1234', semester: 5 }
];

function sendJson(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(data);
    const req = client.request(urlStr, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function registerAndVerify(baseUrl) {
  console.log(`\n=== Processing ${baseUrl} ===`);
  const results = [];

  for (const s of STUDENTS) {
    process.stdout.write(`Registering ${s.name} (${s.email})... `);
    
    // Step 1: Signup
    const signupRes = await sendJson(`${baseUrl}/api/auth/signup`, {
      name: s.name,
      email: s.email,
      password: s.password,
      semester: s.semester,
      branch: s.branch
    });

    if (signupRes.status === 201) {
      console.log('CREATED');
    } else if (signupRes.status === 409) {
      console.log('ALREADY EXISTS (skipping duplicate)');
    } else {
      console.log(`SIGNUP STATUS ${signupRes.status}:`, signupRes.data || signupRes.raw);
    }

    // Step 2: Test Login
    process.stdout.write(`Testing login for ${s.email}... `);
    const loginRes = await sendJson(`${baseUrl}/api/auth/login`, {
      email: s.email,
      password: s.password
    });

    if (loginRes.status === 200) {
      console.log('LOGIN OK ✓');
      results.push({ ...s, verified: true });
    } else {
      console.log(`LOGIN FAILED (${loginRes.status}):`, loginRes.data || loginRes.raw);
      results.push({ ...s, verified: false });
    }
  }

  const successCount = results.filter(r => r.verified).length;
  console.log(`\nSummary for ${baseUrl}: ${successCount}/${STUDENTS.length} accounts verified.`);
  return results;
}

async function main() {
  const target = process.argv[2] || 'https://api.miralpatel.tech';
  await registerAndVerify(target);
}

main().catch(console.error);
