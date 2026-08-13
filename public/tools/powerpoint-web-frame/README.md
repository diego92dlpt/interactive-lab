# Web Frame — put any web page on a PowerPoint slide

Insert a widget, paste an address, and that page runs live on the slide. Free, and not tied to any
particular website or project.

A replacement for the "web viewer" add-ins that charge a subscription. Microsoft's own free one was
retired.

**Windows only.** These instructions have been tested on Windows with PowerPoint 2016. Office
supports this on Mac too, by a different route, but that route is not documented here because it has
not been tested.

---

## The two pieces

| Piece | Where it lives | What it does |
|---|---|---|
| `web-frame.xml` | A **shared folder on the PC** | The manifest. Tells Office the add-in's name and the address of the page below. This is the only file that goes on each machine. |
| `index.html` | **Hosted on an `https://` website** | The widget itself — the toolbar and the frame that holds your page. |

**Why the second piece has to be online.** An Office add-in is not a program. It is a pointer to a
web page, and Office will not load that page from a hard drive. So the manifest stays local, and the
page it points at must be reachable over `https://`.

By default the manifest points at a copy already hosted. To host your own, see
**Hosting it yourself** at the end.

---

# Installing

## Step 1 — Find a folder that is already shared

Office reads the manifest through a Windows network share. **Creating a new share needs
administrator rights**, so it is usually quicker to use one that already exists.

Open PowerShell and run:

```powershell
net share
```

You will see a list. Ignore `C$`, `ADMIN$`, `IPC$` and `print$` — those are built-in and cannot be
used here. On most PCs there is also a **`Users`** share, pointing at `C:\Users`.

**If `Users` is listed**, you are done with sharing. Create a folder inside your own user folder:

```
C:\Users\<your-windows-username>\OfficeAddins
```

and copy `web-frame.xml` into it. Skip to Step 2.

**If `Users` is not listed**, and you have administrator rights, create a share — see
**Creating a share** below, then come back.

## Step 2 — Work out the network path

The path Office needs starts with two backslashes and your PC's name. Get the name with:

```powershell
$env:COMPUTERNAME
```

So if your PC is `DESK1234` and your username is `jsmith`, the path is:

```
\\DESK1234\Users\jsmith\OfficeAddins
```

**Check it works before going any further:**

```powershell
Test-Path "\\DESK1234\Users\jsmith\OfficeAddins\web-frame.xml"
```

This must print `True`. If it prints `False`, the path is wrong or the folder is not really shared —
fix that now, because Office's error message later will not tell you which.

## Step 3 — Tell PowerPoint to trust the folder

1. Open PowerPoint.
2. **File → Options → Trust Center → Trust Center Settings… → Trusted Add-in Catalogs**
3. Paste the network path from Step 2 into **Catalog Url**.
   **It must start with `\\`.** A normal `C:\...` path is accepted by the box and then silently
   ignored, and you will get "Cannot connect to catalog" later with no clue why.
4. Click **Add catalog**.
5. **Tick "Show in Menu"** on the row that appears.
6. **OK**, then **OK**.

## Step 4 — Restart PowerPoint

Close it completely. If unsure, check Task Manager for a lingering `POWERPNT.EXE`.

## Step 5 — Insert the widget

**Home → Add-ins → More Add-ins**, or on some versions **Insert → My Add-ins**.

In the dialog, click the **SHARED FOLDER** tab along the top. **Web Frame** should be listed. Select
it and click **Add**.

Repeat this step for every widget you want — one per slide, as many as you like.

---

## Creating a share (only if you need to, and only with admin rights)

1. Right-click the folder → **Properties** → **Sharing** tab.
2. Under *Network File and Folder Sharing*, click **Share…**
3. A *Network access* window opens. **Your account will usually already be listed as Owner. That does
   not mean the folder is shared.** You must still click the **Share** button at the bottom of this
   window. Closing it, or clicking Cancel, leaves the folder unshared.
4. Approve the Windows administrator prompt if one appears.
5. You should see **"Your folder is shared"** and a path like `\\PCNAME\FolderName`. Note it.
6. Confirm with `net share` — your folder must now be in the list.

That step 3 is the one people get wrong, and Windows gives no warning.

---

# Using it

The widget appears asking for an address. Paste one, press **Show**. Resize and position it like any
other object on the slide.

To change anything later, hover the widget and click the faint **⚙** in the top-right corner, or
press **Esc** while it has focus.

| Control | What it does |
|---|---|
| **Address** | Paste a new one, or pick from **Recent**. |
| **Zoom** | How wide the page believes the window is. A bigger number shows more of the page, drawn smaller. 100% matches the widget. Expect trial and error for each page — how a page responds depends on how it was built. |
| **Height** | Blank means the page fills the widget exactly. Set a number and choose **Show all** (blank edges) or **Crop**, with a 3×3 picker for which part to keep. |
| **Reload** | Reloads the page — useful to reset a simulation someone has fiddled with. |
| **Open in browser** | Opens it full screen. Also the way round a site that refuses to be embedded. |
| **Clear** | Empties the widget. |

Settings are stored inside the `.pptx`, so they come back when the file is reopened. The toolbar is
hidden by default and never appears during a slideshow.

---

# When it goes wrong

| Symptom | Cause |
|---|---|
| No **SHARED FOLDER** tab | The catalog is not registered. Usually PowerPoint was not fully restarted, or **Show in Menu** was not ticked. |
| **"Cannot connect to catalog"** | Office has the entry but cannot reach the folder. Either the share does not exist — check `net share` — or a `C:\` path was entered instead of a `\\` one. |
| Tab appears but is empty | The share is reachable but contains no `.xml`. Check the file copied. |
| Widget inserts but stays blank | The hosted page is unreachable. Open the address from `<SourceLocation>` in a browser; if it fails there, it will fail in PowerPoint. |
| A page you point it at stays blank | That site refuses to be embedded. Nothing on this side can change it — use **Open in browser**. |
| Edited the manifest, nothing changed | Office caches hard. Increase `<Version>` in the XML, or clear `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`. |

**Never change `<Id>` in the manifest after installing.** Office identifies the add-in by that value;
changing it orphans every widget already placed on a slide.

---

# Hosting it yourself

The default manifest points at a shared copy. That is a single 12 KB static file, so it will happily
serve a few dozen people — but if you would rather not depend on someone else's site, host your own.

1. Put `index.html` on any `https://` host — a folder on your web server, GitHub Pages, Netlify,
   Vercel, whatever you already use. It is a plain static file with no build step and no dependencies.
2. Note its address, e.g. `https://yourdomain.com/tools/webframe/`.
3. In `web-frame.xml`, change the `<SourceLocation>` line to that address.
4. Change `<Id>` to a **new GUID** — generate one at guidgenerator.com. Two different installs must
   not share an Id.
5. Increase `<Version>`.
6. Install as above.

Nothing else needs changing. The page has no server side and stores nothing; every setting lives in
the `.pptx` on the presenter's machine.

---

# Limits

- **Needs internet while presenting.** Both the widget and the page it shows load from the web.
- **One machine at a time.** Microsoft treats shared-folder installs as a testing route rather than a
  distribution method, so these steps are repeated per PC. It is entirely reliable once done.
- **Windows.** See the note at the top.
