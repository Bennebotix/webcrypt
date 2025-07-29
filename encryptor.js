const encrypt = async (e) => {
  let pass = Webcrypt.genSeed();
	let key = await Webcrypt.genKey(pass);
  
  const file = e.target.files[0];
  
  let oldZip = new JSZip();
  let newZip = new JSZip();

  const fileData = await file.arrayBuffer();
  const zipContent = await oldZip.loadAsync(fileData);

  const saveToZIP = async (file, path) => {
    await newZip.file(path, file, { binary: true });
  };

  const download = async () => {
    try {
      const content = await newZip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);

      console.log(url)
      
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    }
  };

  for (const [relativePath, entry] of Object.entries(zipContent.files)) {
    if (!entry.dir) {
      await saveToZIP(await Webcrypt.encrypt(await entry.async("uint8array"), key), '/data/' + relativePath);
    }
  }

  await download()
}
