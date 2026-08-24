const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const firebaseConfig = {
    projectId: config.projectId,
    appId: config.appId,
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    storageBucket: config.storageBucket,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
    const querySnapshot = await getDocs(collection(db, "lessons"));
    console.log("Lessons count:", querySnapshot.size);
    process.exit(0);
}
run();
