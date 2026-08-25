RecruitOps — Central Server Setup (Windows)
=============================================

This gives your whole team ONE shared dataset. One computer runs the
"server" folder (it just stores the data). Everyone else opens the
recruitops.html file in their own browser, points it at that server,
and from then on everyone sees the same clients, candidates, pipeline,
offers, etc. in real time (auto-refreshes every ~8 seconds).


PART A — Set up the server (do this ONCE, on ONE computer)
------------------------------------------------------------
Pick a computer that can stay switched on during work hours — a desktop
that's always on is ideal. This does not need to be a powerful machine.

1. Install Node.js
   Go to https://nodejs.org, download the "LTS" version for Windows,
   and run the installer (accept all defaults).

2. Copy this "recruitops-server" folder onto that computer,
   e.g. to C:\RecruitOps\recruitops-server

3. Open Command Prompt in that folder
   - Open the folder in File Explorer
   - Click the address bar, type "cmd", press Enter
   (A black command-prompt window opens, already in the right folder.)

4. Install dependencies (only needed once)
   Type:
       npm install
   Press Enter and wait for it to finish.

5. Start the server
   Type:
       npm start
   You should see:
       RecruitOps server running at http://localhost:4000
   Leave this window open — closing it stops the server.

6. Find this computer's IP address (so others can reach it)
   Open a NEW Command Prompt window and type:
       ipconfig
   Look for "IPv4 Address" under your active network adapter,
   e.g. 192.168.1.42
   Your team will use: http://192.168.1.42:4000

7. Allow the connection through Windows Firewall
   The first time the server starts, Windows may show a firewall
   prompt — click "Allow access" (for Private networks at least).
   If teammates can't connect, check Windows Defender Firewall →
   "Allow an app through firewall" and make sure Node.js is allowed,
   or open TCP port 4000 for your Private network.

Note: this basic setup works well on one office/home network. If your
team is spread across different locations/networks, the server needs
to be reachable over the internet instead (e.g. hosted on a cloud VM)
— ask if you want help setting that up.


PART B — Everyone else: connect to the shared server
------------------------------------------------------------
1. Get the recruitops.html file (from whoever set up the server, or
   the same download link you used before) and save it anywhere.

2. Double-click recruitops.html to open it in your browser.

3. On the login screen, under "Central server", click "change" and
   enter the server address from Part A step 6, e.g.:
       http://192.168.1.42:4000
   It should show green once connected.

4. Log in with one of the seeded accounts (or one your admin created
   in Settings → Team Members):
       admin / admin123        (Super Admin)
       priya / demo123         (Recruitment Head)
       vikram / demo123        (Team Leader)
       rahul / demo123         (Recruiter)
       anjali / demo123        (Recruiter)
       sanjay / demo123        (Sales / AM)
       neha / demo123          (Management)

That's it — anything anyone adds, moves, or edits is now visible to
everyone else within a few seconds.


NOTES
------
- This stores data in a plain data.json file inside the server folder.
  Back it up occasionally (Settings → Data & Backup → Download Backup,
  or just copy data.json).
- Resumes are stored in the server's "resumes" folder — one central
  folder, shared by everyone. Upload/replace a resume from a
  candidate's detail view (click the eye icon on the Candidates page).
  Files are capped at 10MB; PDF, DOC, DOCX, RTF, TXT are accepted.
- There's no password hashing or encryption here — fine for an internal
  team tool on a trusted network, not for exposing to the public internet.
- If two people edit the exact same record at the exact same moment,
  the last save wins (no merge/lock). Fine for normal day-to-day use.
- To reset everything back to the demo dataset: Settings → Data & Backup
  → Reset All Data (Super Admin only — affects all users immediately).


PART C — Want a real public URL instead of a local network address?
------------------------------------------------------------
The steps above work great when everyone is on the same office/home
Wi-Fi. If your team is spread across different locations, "PART A"
needs to run somewhere reachable over the internet instead of on
someone's desk. The cheapest, simplest option is a small cloud host:

1. Create a free account on Render.com (or Railway.app — similar steps).
2. Create a new "Web Service", connect it to a GitHub repo containing
   this recruitops-server folder (push it to a new GitHub repo first).
3. Set the start command to: npm start
4. Add a Render "Persistent Disk" (or Railway Volume) mounted at
   /opt/render/project/src (or wherever the app runs from) so
   data.json and the resumes folder survive restarts — without this,
   uploads/data can be wiped on redeploy.
5. Once deployed, Render gives you a public URL like
   https://recruitops-yourteam.onrender.com — use that as the
   "Central server" address in recruitops.html instead of the
   local-network IP address.

This involves creating accounts, pushing code to GitHub, and configuring
persistent storage — a real (if small) deployment task. If you'd like
hands-on help actually doing this deployment step by step, Claude Code
is the better tool for that part, since it can push code, configure the
host, and verify the live deployment directly.
