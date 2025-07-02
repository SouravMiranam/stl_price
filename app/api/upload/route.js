import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, file.name);
    await writeFile(filePath, buffer);

    // 👇 Docker exec: shared volume maps file inside prusaslicer as /data/filename
    const filename = file.name;
    const command = `docker exec prusaslicer prusa-slicer /data/${filename} --load /config.ini --gcode-comments --export-gcode`;

    return new Promise((resolve) => {
      exec(command, async (err, stdout, stderr) => {
        if (err) {
          return resolve(NextResponse.json({
            success: false,
            error: `PrusaSlicer error: ${err.message}`,
            stderr,
            stdout
          }));
        }

        try {
          const gcodeFilePath = filePath.replace(/\.stl$/i, '.gcode');
          const gcodeContent = await readFile(gcodeFilePath, 'utf-8');

          const parameters = {};
          const lines = gcodeContent.split('\n');

          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;

          lines.forEach(line => {
            if (line.includes('; filament used [mm] =')) {
              parameters['Filament Length'] = line.split('=')[1].trim() + ' mm';
            }
            if (line.includes('; filament used [cm3] =')) {
              parameters['Filament Volume'] = line.split('=')[1].trim() + ' cm³';
            }
            if (line.includes('; total filament used [g] =')) {
              parameters['Filament Weight'] = line.split('=')[1].trim() + ' g';
            }
            if (line.includes('; estimated printing time (normal mode) =')) {
              parameters['Print Time'] = line.split('=')[1].trim();
            }
            if (line.includes('; estimated first layer printing time (normal mode) =')) {
              parameters['First Layer Time'] = line.split('=')[1].trim();
            }

            if (line.startsWith('G1') || line.startsWith('G0')) {
              const xMatch = line.match(/X([-\d.]+)/);
              const yMatch = line.match(/Y([-\d.]+)/);
              const zMatch = line.match(/Z([-\d.]+)/);

              if (xMatch) {
                const x = parseFloat(xMatch[1]);
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
              }
              if (yMatch) {
                const y = parseFloat(yMatch[1]);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
              }
              if (zMatch) {
                const z = parseFloat(zMatch[1]);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
              }
            }
          });

          if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity && minZ !== Infinity && maxZ !== -Infinity) {
            const width = (maxX - minX).toFixed(2);
            const depth = (maxY - minY).toFixed(2);
            const height = (maxZ - minZ).toFixed(2);
            const volume = (width * depth * height / 1000).toFixed(2); // cm³

            parameters['Print Dimensions'] = `${width} × ${depth} × ${height} mm`;
            parameters['Print Volume'] = `${volume} cm³`;
          }

          const filamentWeight = parseFloat(parameters['Filament Weight']?.replace(' g', '') || '0');
          if (filamentWeight > 0) {
            const estimatedCost = (filamentWeight * 0.02).toFixed(2);
            parameters['Estimated Cost'] = `$${estimatedCost}`;
          }

          resolve(NextResponse.json({
            success: true,
            parameters,
            filePath,
            gcodeFilePath
          }));
        } catch (parseError) {
          resolve(NextResponse.json({
            success: false,
            error: `Failed to parse G-code: ${parseError.message}`
          }));
        }
      });
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
