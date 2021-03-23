import { toRefs, reactive } from "vue";
import firebase from "firebase";
import "firebase/firestore";
import FIREBASE_CONFIG from "./.env.firebase";
import {Md5} from "md5-typescript";
 
// initialize firebase
if (firebase.apps.length === 0) {
    firebase.initializeApp(FIREBASE_CONFIG);
}

const db = firebase.firestore();
const usersCollection = db.collection("users");
const state = reactive<{ user: any; initialized: boolean; error: any }>({
    user: null,
    initialized: false,
    error: null,
});

export default function () {
    // Login function with firebase auth
    const login = (email: string, password: string) => {
        return firebase
            .auth()
            .signInWithEmailAndPassword(email, password)
            .then(
                (user) => {
                    state.user = user;
                    state.error = null;
                    return user;
                },
                (error) => {
                    state.error = error;
                    throw error;
                }
            );
    };

    // Register function with firebase auth
    const register = (nome: string, cognome: string, cf: string, email: string, password: string) => {
        if (nome != null && cognome != null && cf != null && email != null && password != null) {
            return firebase
                .auth()
                .createUserWithEmailAndPassword(email, password)
                .then(
                    (user) => {
                        state.user = user;

                        // If user is added firebase auth su successfully, add this one to users table too 
                        const uid = user.user?.uid;
                        if (uid != null) {
                            usersCollection
                                .add({
                                    uid: uid,
                                    nome: nome,
                                    cognome: cognome,
                                    cf: cf,
                                    email: email,
                                    password: Md5.init(password),
                                })
                                .then(() => {
                                    state.error = null;
                                    return user;
                                })
                                .catch((error) => {
                                    state.error = "Errore nel caricamento dei dati: " + error;
                                    throw error;
                                });
                        } else {
                            state.error = "Dati non conformi, caricamento annullato";
                            return;
                        }
                    },
                    (error) => {
                        state.error = error;
                        throw error;
                    }
                );
        }
    };

    // Logout function with firebase auth
    const logout = () => {
        return firebase
            .auth()
            .signOut()
            .then(() => {
                state.user = null;
            });
    };

    // Run during startup
    const authCheck = () => {
        return new Promise((resolve, reject) => {
            !state.initialized &&
                firebase.auth().onAuthStateChanged(async (_user) => {
                    if (_user) {
                        state.user = _user;
                    } else {
                        state.user = null;
                    }
                    state.initialized = true;
                    console.log(_user);
                    resolve(true);
                });
        });
    };

    // Return user id of authentication
    const getLoggedUserInfo = () => {
        return firebase
            .auth()
            .currentUser
    };

    return {
        ...toRefs(state),
        login,
        register,
        logout,
        authCheck,
        getLoggedUserInfo
    };
}
