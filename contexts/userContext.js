import {createContext, useState} from "react";
import firebase from "firebase/app"
import "firebase/auth";
import "firebase/firestore"
import {firebaseConfig} from "../util/firebaseConfig";
import {useEffect} from "react";


export const userContext = createContext(null);





export default function UserContextProvider({children}) {

    if(!firebase.apps.length){
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    const [user, setUSer] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        auth.onAuthStateChanged((data) => {


            if (data) {
              // User is signed in.
                console.log(data.uid)

               

                db.collection("users").doc(data.uid).get().then(userData => {
                    const user = userData.data();
                    setUSer({
                        ...user,
                        hasDrown: user.totalCash !== user.totalCash_H,
                    });
                  })
              
              console.log("user signed in")

            } else {
              // No user is signed in.
                setUSer(null)
                console.log("user not signed in")

            }
          });

    }, [])



    const signInUser = async (email,pwd) => {
        await auth.signInWithEmailAndPassword(email,pwd).then( () => {
            setError("");
        }).catch(error => {
            setError(error.message)
        })
    }
    const signOutUser = async () => {
        await auth.signOut();
    }
    const forgotPassword = async (email) => {

        const regEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let returnData;

        if(!regEx.test(email)){
            setError("Please enter a Email address")
            returnData = {
                error:true,
                message:"Field can not be empty",
            }
        }else{

            
            await auth.sendPasswordResetEmail(email).then(res => {
                setError("")
                returnData = {
                    error:false,
                    message:"Success"
                };
            }).catch(err => {
                setError(err.message);
                returnData = {
                    error:true,
                    message: err.message,
                };
            })

        }

        
        return returnData;
    }


    return (
        <userContext.Provider value={{user,error, signInUser,signOutUser, forgotPassword}}>
            {children} 
        </userContext.Provider>
    )
}
