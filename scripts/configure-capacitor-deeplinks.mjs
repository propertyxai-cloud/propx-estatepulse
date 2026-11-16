import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const target = (process.argv[2] || '').toLowerCase();
const scheme = 'com.propertyxai.marketplace';

if (!['android', 'ios'].includes(target)) {
  throw new Error('Usage: node scripts/configure-capacitor-deeplinks.mjs android|ios');
}

async function configureAndroid() {
  const file = path.resolve('android/app/src/main/AndroidManifest.xml');
  let xml = await readFile(file, 'utf8');
  if (xml.includes(`android:scheme="${scheme}"`)) {
    console.log('Android PropertyX OAuth deep link already configured.');
    return;
  }
  const activity = /(<activity\b(?=[^>]*android:name="\.MainActivity")[^>]*>)([\s\S]*?)(<\/activity>)/;
  if (!activity.test(xml)) {
    throw new Error('Could not locate the Capacitor MainActivity in AndroidManifest.xml');
  }
  const filter = `
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>`;
  xml = xml.replace(activity, `$1$2${filter}\n        $3`);
  await writeFile(file, xml);
  console.log('Registered Android callback: ' + scheme + '://auth/callback');
}

async function configureIos() {
  const file = path.resolve('ios/App/App/Info.plist');
  let plist = await readFile(file, 'utf8');
  if (plist.includes(`<string>${scheme}</string>`)) {
    console.log('iOS PropertyX OAuth deep link already configured.');
    return;
  }
  const block = `
    <key>CFBundleURLTypes</key>
    <array>
      <dict>
        <key>CFBundleURLName</key>
        <string>PropertyX Authentication</string>
        <key>CFBundleURLSchemes</key>
        <array>
          <string>${scheme}</string>
        </array>
      </dict>
    </array>
`;
  const close = plist.lastIndexOf('</dict>');
  if (close < 0) throw new Error('Could not locate the root dictionary in Info.plist');
  plist = plist.slice(0, close) + block + plist.slice(close);
  await writeFile(file, plist);
  console.log('Registered iOS callback: ' + scheme + '://auth/callback');
}

if (target === 'android') await configureAndroid();
if (target === 'ios') await configureIos();
