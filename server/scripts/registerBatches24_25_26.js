const https = require('https');
const http = require('http');

// 36 Additional students for batches 24, 25, 26 (12 students each batch: 3 ICT, 3 Mech, 3 Elect, 3 EC)
const ADDITIONAL_STUDENTS = [
  // --- BATCH 24 (Second Year) ---
  // ICT
  { name: 'Tanvi Shah', branch: 'Information and Communication Technology', academicYear: 'Second Year', rollNumber: '24BIT141', email: '24BIT141@pdpu.ac.in', password: 'Tanvi@1234', semester: 3 },
  { name: 'Karan Dave', branch: 'Information and Communication Technology', academicYear: 'Second Year', rollNumber: '24BIT156', email: '24BIT156@pdpu.ac.in', password: 'Karan@1234', semester: 3 },
  { name: 'Ishita Vyas', branch: 'Information and Communication Technology', academicYear: 'Second Year', rollNumber: '24BIT172', email: '24BIT172@pdpu.ac.in', password: 'Ishita@1234', semester: 3 },
  // Mechanical
  { name: 'Varun Soni', branch: 'Mechanical Engineering', academicYear: 'Second Year', rollNumber: '24BME183', email: '24BME183@pdpu.ac.in', password: 'Varun@1234', semester: 3 },
  { name: 'Riya Parmar', branch: 'Mechanical Engineering', academicYear: 'Second Year', rollNumber: '24BME195', email: '24BME195@pdpu.ac.in', password: 'Riya@1234', semester: 3 },
  { name: 'Yash Sharma', branch: 'Mechanical Engineering', academicYear: 'Second Year', rollNumber: '24BME208', email: '24BME208@pdpu.ac.in', password: 'Yash@1234', semester: 3 },
  // Electrical
  { name: 'Khushi Panchal', branch: 'Electrical Engineering', academicYear: 'Second Year', rollNumber: '24BEE217', email: '24BEE217@pdpu.ac.in', password: 'Khushi@1234', semester: 3 },
  { name: 'Manan Shukla', branch: 'Electrical Engineering', academicYear: 'Second Year', rollNumber: '24BEE229', email: '24BEE229@pdpu.ac.in', password: 'Manan@1234', semester: 3 },
  { name: 'Bhavya Doshi', branch: 'Electrical Engineering', academicYear: 'Second Year', rollNumber: '24BEE236', email: '24BEE236@pdpu.ac.in', password: 'Bhavya@1234', semester: 3 },
  // EC
  { name: 'Jatin Prajapati', branch: 'Electronics and Communication Engineering', academicYear: 'Second Year', rollNumber: '24BCE248', email: '24BCE248@pdpu.ac.in', password: 'Jatin@1234', semester: 3 },
  { name: 'Vidhi Trivedi', branch: 'Electronics and Communication Engineering', academicYear: 'Second Year', rollNumber: '24BCE259', email: '24BCE259@pdpu.ac.in', password: 'Vidhi@1234', semester: 3 },
  { name: 'Pranav Bhatt', branch: 'Electronics and Communication Engineering', academicYear: 'Second Year', rollNumber: '24BCE274', email: '24BCE274@pdpu.ac.in', password: 'Pranav@1234', semester: 3 },

  // --- BATCH 25 (Third Year) ---
  // ICT
  { name: 'Siddharth Vora', branch: 'Information and Communication Technology', academicYear: 'Third Year', rollNumber: '25BIT141', email: '25BIT141@pdpu.ac.in', password: 'Siddharth@1234', semester: 5 },
  { name: 'Meera Rao', branch: 'Information and Communication Technology', academicYear: 'Third Year', rollNumber: '25BIT156', email: '25BIT156@pdpu.ac.in', password: 'Meera@1234', semester: 5 },
  { name: 'Chirag Solanki', branch: 'Information and Communication Technology', academicYear: 'Third Year', rollNumber: '25BIT172', email: '25BIT172@pdpu.ac.in', password: 'Chirag@1234', semester: 5 },
  // Mechanical
  { name: 'Kinjal Thakkar', branch: 'Mechanical Engineering', academicYear: 'Third Year', rollNumber: '25BME183', email: '25BME183@pdpu.ac.in', password: 'Kinjal@1234', semester: 5 },
  { name: 'Hardik Makwana', branch: 'Mechanical Engineering', academicYear: 'Third Year', rollNumber: '25BME195', email: '25BME195@pdpu.ac.in', password: 'Hardik@1234', semester: 5 },
  { name: 'Shruti Pandya', branch: 'Mechanical Engineering', academicYear: 'Third Year', rollNumber: '25BME208', email: '25BME208@pdpu.ac.in', password: 'Shruti@1234', semester: 5 },
  // Electrical
  { name: 'Parth Raval', branch: 'Electrical Engineering', academicYear: 'Third Year', rollNumber: '25BEE217', email: '25BEE217@pdpu.ac.in', password: 'Parth@1234', semester: 5 },
  { name: 'Heli Somani', branch: 'Electrical Engineering', academicYear: 'Third Year', rollNumber: '25BEE229', email: '25BEE229@pdpu.ac.in', password: 'Heli@1234', semester: 5 },
  { name: 'Nikhil Gajjar', branch: 'Electrical Engineering', academicYear: 'Third Year', rollNumber: '25BEE236', email: '25BEE236@pdpu.ac.in', password: 'Nikhil@1234', semester: 5 },
  // EC
  { name: 'Zalak Chokshi', branch: 'Electronics and Communication Engineering', academicYear: 'Third Year', rollNumber: '25BCE248', email: '25BCE248@pdpu.ac.in', password: 'Zalak@1234', semester: 5 },
  { name: 'Harshil Gohil', branch: 'Electronics and Communication Engineering', academicYear: 'Third Year', rollNumber: '25BCE259', email: '25BCE259@pdpu.ac.in', password: 'Harshil@1234', semester: 5 },
  { name: 'Swati Kulkarni', branch: 'Electronics and Communication Engineering', academicYear: 'Third Year', rollNumber: '25BCE274', email: '25BCE274@pdpu.ac.in', password: 'Swati@1234', semester: 5 },

  // --- BATCH 26 (Fourth Year) ---
  // ICT
  { name: 'Darshan Jani', branch: 'Information and Communication Technology', academicYear: 'Fourth Year', rollNumber: '26BIT141', email: '26BIT141@pdpu.ac.in', password: 'Darshan@1234', semester: 7 },
  { name: 'Mansi Goswami', branch: 'Information and Communication Technology', academicYear: 'Fourth Year', rollNumber: '26BIT156', email: '26BIT156@pdpu.ac.in', password: 'Mansi@1234', semester: 7 },
  { name: 'Kunal Barot', branch: 'Information and Communication Technology', academicYear: 'Fourth Year', rollNumber: '26BIT172', email: '26BIT172@pdpu.ac.in', password: 'Kunal@1234', semester: 7 },
  // Mechanical
  { name: 'Hetvi Kansara', branch: 'Mechanical Engineering', academicYear: 'Fourth Year', rollNumber: '26BME183', email: '26BME183@pdpu.ac.in', password: 'Hetvi@1234', semester: 7 },
  { name: 'Jayraj Jadeja', branch: 'Mechanical Engineering', academicYear: 'Fourth Year', rollNumber: '26BME195', email: '26BME195@pdpu.ac.in', password: 'Jayraj@1234', semester: 7 },
  { name: 'Forum Upadhyay', branch: 'Mechanical Engineering', academicYear: 'Fourth Year', rollNumber: '26BME208', email: '26BME208@pdpu.ac.in', password: 'Forum@1234', semester: 7 },
  // Electrical
  { name: 'Tirth Chaudhari', branch: 'Electrical Engineering', academicYear: 'Fourth Year', rollNumber: '26BEE217', email: '26BEE217@pdpu.ac.in', password: 'Tirth@1234', semester: 7 },
  { name: 'Drashti Kapadia', branch: 'Electrical Engineering', academicYear: 'Fourth Year', rollNumber: '26BEE229', email: '26BEE229@pdpu.ac.in', password: 'Drashti@1234', semester: 7 },
  { name: 'Omkar Modh', branch: 'Electrical Engineering', academicYear: 'Fourth Year', rollNumber: '26BEE236', email: '26BEE236@pdpu.ac.in', password: 'Omkar@1234', semester: 7 },
  // EC
  { name: 'Jhanvi Oza', branch: 'Electronics and Communication Engineering', academicYear: 'Fourth Year', rollNumber: '26BCE248', email: '26BCE248@pdpu.ac.in', password: 'Jhanvi@1234', semester: 7 },
  { name: 'Deepen Rana', branch: 'Electronics and Communication Engineering', academicYear: 'Fourth Year', rollNumber: '26BCE259', email: '26BCE259@pdpu.ac.in', password: 'Deepen@1234', semester: 7 },
  { name: 'Niyati Parekh', branch: 'Electronics and Communication Engineering', academicYear: 'Fourth Year', rollNumber: '26BCE274', email: '26BCE274@pdpu.ac.in', password: 'Niyati@1234', semester: 7 }
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

async function registerBatch(baseUrl) {
  console.log(`\n=== Registering Batches 24, 25, 26 on ${baseUrl} ===`);
  const verified = [];

  for (const s of ADDITIONAL_STUDENTS) {
    process.stdout.write(`Registering [${s.academicYear}] ${s.name} (${s.email})... `);
    
    // Step 1: Signup
    const signupRes = await sendJson(`${baseUrl}/api/auth/signup`, {
      name: s.name,
      email: s.email,
      password: s.password,
      semester: s.semester,
      branch: s.branch,
      academicYear: s.academicYear
    });

    if (signupRes.status === 201) {
      console.log('CREATED');
    } else if (signupRes.status === 409) {
      console.log('EXISTS');
    } else {
      console.log(`STATUS ${signupRes.status}:`, signupRes.data || signupRes.raw);
    }

    // Step 2: Test Login
    process.stdout.write(`Testing login for ${s.email}... `);
    const loginRes = await sendJson(`${baseUrl}/api/auth/login`, {
      email: s.email,
      password: s.password
    });

    if (loginRes.status === 200) {
      console.log('OK ✓');
      verified.push(s);
    } else {
      console.log(`FAIL (${loginRes.status})`);
    }
  }

  console.log(`\nCompleted: ${verified.length}/${ADDITIONAL_STUDENTS.length} students verified.`);
}

const target = process.argv[2] || 'https://api.miralpatel.tech';
registerBatch(target).catch(console.error);
