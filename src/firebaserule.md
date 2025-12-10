rules_version = '2';

service cloud.firestore {
match /databases/{database}/documents {

    // Emigrant data collections
    match /emigrantData_destination/{document=**} {
      allow read, write: if true;
    }
    match /emigrantData_province/{document=**} {
      allow read, write: if true;
    }
    match /emigrantData_age/{document=**} {
      allow read, write: if true;
    }
    match /emigrantData_sex/{document=**} {
      allow read, write: if true;
    }
    match /emigrantData_civilStatus/{document=**} {
      allow read, write: if true;
    }
    match /emigrantData_education/{document=**} {
      allow read, write: if true;
    }
    match /emigrantData_occupation/{document=**} {
      allow read, write: if true;
    }

    // Uploaded CSV metadata
    match /uploadedCSVFiles/{document=**} {
      allow read, write: if true;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }

}
}s
