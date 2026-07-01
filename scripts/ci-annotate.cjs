// Reads jest-results.json and writes GitHub Actions ::error:: annotations.
// Runs as CommonJS (.cjs) so it works regardless of "type": "module".
import fs from 'fs';

try {
  const r = JSON.parse(fs.readFileSync('jest-results.json', 'utf8'));

  (r.testResults || []).forEach(suite => {
    const fp = (suite.testFilePath || suite.filePath || 'unknown').replace(
      process.cwd() + '/',
      ''
    );

    // Suite-level failure — crashed before any individual test ran
    if (suite.status === 'failed' && !(suite.assertionResults || []).length) {
      const msg = (suite.message || 'Suite failed to run').slice(0, 200);
      process.stdout.write('::error file=' + fp + '::' + msg + '\n');
      return;
    }

    (suite.assertionResults || []).forEach(t => {
      if (t && t.status === 'failed') {
        const name =
          t.fullName ||
          (t.ancestorTitles || []).concat([t.title || '']).join(' > ');
        const msg = (t.failureMessages || [])
          .join(' ')
          .replace(/[\n\r]/g, ' ')
          .slice(0, 200);
        process.stdout.write(
          '::error file=' + fp + '::' + name + ' -- ' + msg + '\n'
        );
      }
    });
  });
} catch (e) {
  process.stdout.write(
    '::warning::Could not parse test results for annotations: ' +
      e.message +
      '\n'
  );
}
