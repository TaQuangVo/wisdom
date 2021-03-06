import {useState,useContext} from 'react'
import stylePurchase from "../styles/StylePurchase.module.css";
import {motion} from "framer-motion"
import axios from "axios";
import { useRouter } from 'next/router'
import Link from "next/link";

//contexts
import {userContext} from "../contexts/userContext"
import {languageContext} from "../contexts/languageContext";

/*spinner*/
import Loader from "react-loader-spinner";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";

//stripe
import {CardElement, useStripe, useElements} from "@stripe/react-stripe-js";


export default function purchase() {
    //dataState
    const [name,setName] = useState("");
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [code,setCode] = useState("");
    const [paymentIntentId, setPaymentIntentId] = useState("");

    //ui State
    const [isLoading,setIsLoading] = useState(false);
    const [isSecondformLoading, setIsSecondformLoading] = useState(false);
    const [didPaymentSuccess,setDidPaymentSuccess] = useState(0); //0 init, 1 loading, 2 success, 3 failed
    const [didAccountCreated,setDidAccountCreated] = useState(0);//0 init, 1 loading, 2 success, 3 failed
    const [error,setError] = useState("");

    //userData;
    const [userData,setUSerData] = useState (null);

    //usersignin
    const {user} = useContext(userContext);


    const elements = useElements();
    const stripe = useStripe();
    const router = useRouter();

    const  {isEng, changeLanguage} = useContext(languageContext);

    const textAlign = isEng ? "left":"right";

    const languageLayout = (Engver, ArbVer) => {
        if(isEng){
            return Engver;
        }else{
            return ArbVer;
        }
    }


    const handleChange = (e) => {
        if(e.target.name === "email"){
            setEmail(e.target.value);
        }else if (e.target.name === "password"){
            setPassword(e.target.value);
        }else if (e.target.name === "name"){
            setName(e.target.value);
        }else if (e.target.name === "code"){
            setCode(e.target.value);
        }else if (e.target.name === "card"){
            setCard(e.target.value);
        }else if (e.target.name === "info"){
            setInfo(e.target.value);
        }else if (e.target.name === "password"){
            
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const regEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let infoVerify = ""

        if(name ===""){
            infoVerify = "Fill in your name"
        }else if(!regEx.test(email)){
            infoVerify = "Fill in a valid Email"
            console.log(regEx.test(email))
        }else if(password.length < 6){
            infoVerify = "Password has to be at least 6 charactors"
        }else if(code === ""){
            infoVerify = "fill in your code"
        }else if(user !== null){
            infoVerify = "Please log out before purchasing"
        }



        if(infoVerify === ""){

            setIsLoading(true);
            setDidPaymentSuccess(1);
            setError("");
    
            let paymentIntent;
            let status = "init"; 

            //get payment intents from serve
            const intents = await axios.post("https://us-central1-wisdom-f3ec1.cloudfunctions.net/api/paymentintent",{
                email,
                code,
            });
            //console.log(intents);

            if(!intents.data.error){

                //create a payment medthod;
                const billingDetails = {name:name,email:email}
                const cardElement = elements.getElement(CardElement);

                const paymentMethod = await stripe.createPaymentMethod({
                    type:"card",
                    card:cardElement,
                    billing_details:billingDetails,
                });
                //console.log(paymentMethod)

                if(!paymentMethod.error){

                    //confirm payment
                    const confirmPayment = await stripe.confirmCardPayment(intents.data.paymentIntent,{
                        payment_method: paymentMethod.paymentMethod.id
                    })
                    //console.log(confirmPayment)
                    //console.log(confirmPayment.paymentIntent.status)

                    if(!confirmPayment.error){

                        if(confirmPayment.paymentIntent.status === "succeeded"){
                            //console.log("Payment succeded")
                            setError("")
                            setDidPaymentSuccess(2);
                            setPaymentIntentId(confirmPayment.paymentIntent.id);
                            paymentIntent = confirmPayment.paymentIntent.id;
                            status = "payment_success";//set to success
                        }else{
                            setError("Payment did not whent throgh")
                            setDidPaymentSuccess(3);
                            //console.log("Payment failed")
                            status = "payment_failed";
                        }

                    }else{

                        setError("Payment failed! ( "+ confirmPayment.error.message + " ).");
                        setDidPaymentSuccess(3);
                        //console.log(confirmPayment.error.message);
                        status = "payment_failed";
                    }
                    
                }else{
                    setError("Payment failed! ( "+ paymentMethod.error.message + " ).");
                    setDidPaymentSuccess(3);
                    //console.log(paymentMethod.error.message);
                    status = "payment_failed";
                }

                
            }else{
                setError("Payment failed! ( "+ intents.data.message + " )." )
                console.log(intents);
                setDidPaymentSuccess(3);
                //console.log(intents.data.mesage)
                status = "payment_failed";
            }


            if(status === "payment_success"){
                console.log("payment success")
                setDidAccountCreated(1);

                //create accout 
                const {data} = await axios.post("https://us-central1-wisdom-f3ec1.cloudfunctions.net/api/createaccout",{
                    email,
                    name,
                    password,
                    code,
                    paymentIntentId : paymentIntent,
                });
                console.log(data);

                if(!data.error){
                    setDidAccountCreated(2);
                    setError("")
                    setUSerData(data.userData)
                }else{
                    setDidAccountCreated(3);
                    setError(data.message)
                }

            }

        }else{
            setError(infoVerify);
        }
    }

    const handleSecondFormSubmit = async (e) => {

        e.preventDefault();


        const regEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let infoVerify = ""

        if(name ===""){
            infoVerify = "Fill in your name"
        }else if(!regEx.test(email)){
            infoVerify = "Fill in a valid Email"
            console.log(regEx.test(email))
        }else if(password.length < 6){
            infoVerify = "Password has to be at least 6 charactors"
        }else if(code === ""){
            infoVerify = "fill in your code"
        }

        if(infoVerify === ""){

            setIsSecondformLoading(true);
            setDidAccountCreated(1);
            setError("");
    
             //create accout 
             const {data} = await axios.post("https://us-central1-wisdom-f3ec1.cloudfunctions.net/api/createaccout",{
                email,
                name,
                password,
                code,
                paymentIntentId 
            });
            console.log(data);
    
            if(!data.error){
                setDidAccountCreated(2);
                setError("")
                setUSerData(data.userData);

            }else{
                setDidAccountCreated(3);
                console.log(data);
                setError(data.message)
            }
    

        }else{
            setError(infoVerify);
        }

        setIsSecondformLoading(false);

    }

    const cardElementOptions = {
        hidePostalCode: true,
        style:{
            base:{
                color:"white",
                fontSize: "1rem",
                "::placeholder":{
                    color:"rgba(255, 255, 255, 0.61)"
                },
                iconColor:"rgba(255, 255, 255)"
            },
            invalid:{
            },
            complete:{

            },
        }
    }

    return (
        <motion.div 
        className={stylePurchase.container}
        exit={{opacity:0}} 
        initial={{opacity:0}} 
        animate={{opacity:1}} 
        >
            <div className={stylePurchase.content}>
                { userData === null ?
            (
                <div className={stylePurchase.body}>
                    <div className={stylePurchase.discriptions}> 
                        {languageLayout(<h1>Purchase a Wisdom</h1>,<h1>اشتري حكمة</h1>)}
                        <h2>3.95$</h2> 
                        {languageLayout(<p>You will receive a wisdom and a code</p>,<p>ستحصل على حكمة ورمز خاص بك</p>)}
                        {languageLayout(<p>after the payment went through.</p>,<p>بعد قيامك بعملية الشراء</p>)}
                    </div>
                    <span className={stylePurchase.divider}></span>
                    <div className={stylePurchase.forms}>
                        <form onSubmit={e => handleSubmit(e)} className={isLoading ? "displayNone" : ""}>
                            <div>
                                
                                {languageLayout(<h3 >Create an accout</h3>,<h3 className="arabicText">انشاء حساب</h3>)}
                                <input 
                                    style={{textAlign:textAlign}}
                                    onChange={e => handleChange(e)} 
                                    type="text" 
                                    name="name" 
                                    placeholder={languageLayout("Name","الأسم")} 
                                    value={name}/>
                                <input 
                                    style={{textAlign:textAlign}}
                                    onChange={e => handleChange(e)} 
                                    type="text" name="email" 
                                    placeholder={languageLayout("Email","البريد الألكتروني")} 
                                    value={email}/>
                                <input 
                                    style={{textAlign:textAlign}}
                                    onChange={e => handleChange(e)} 
                                    type="password" name="password" 
                                    placeholder={languageLayout("Password","كلمة المرور")} />
                                {languageLayout(<h3 >Purchase Code</h3>,<h3 className="arabicText">رمز الشراء</h3>)}
                                <input 
                                    style={{textAlign:textAlign}}
                                    onChange={e => handleChange(e)} 
                                    type="text" name="code" 
                                    placeholder={languageLayout("Purchase code" ,"رمز الشراء")} 
                                    value={code}/>
                                {languageLayout(<h3>Payment</h3>,<h3 className="arabicText">الدفع</h3>)}
                                <div className={stylePurchase.cardElementContainer}>
                                    <CardElement options={cardElementOptions} />
                                </div>
                                {languageLayout(<p className={stylePurchase.acceptPolicy}>* By commiting the payment, you agreed to our <span><Link href="/policy">Purchasing policy</Link></span></p>,<p className={[stylePurchase.acceptPolicy,"arabicText"].join(" ")} >* من خلال قيامك بعملية الشراء<span><Link href="/policy">سياسة الشراء</Link></span>الخاصة  بنا</p>)}
                                
                                <button type="submit" disabled={isLoading || !stripe}>
                                {languageLayout("Get my wisdom","احصل على الحكمة")}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.3 17">
                                        <polygon points="10.3 8.5 1.8 0 0 1.8 6.7 8.5 0 15.2 1.8 17 10.3 8.5"/>
                                    </svg>
                                </button>
                                <p className={stylePurchase.formOneError}>{error}</p>
                            </div>
                            
                        </form>
                        <form onSubmit={e => handleSecondFormSubmit(e)} className={isLoading ? "" : "displayNone"} >
                            <div className={stylePurchase.creatingPayment}>
                                <div className={stylePurchase.loaders}>
                                    <Loader
                                        type="BallTriangle"
                                        color="rgba(255, 255, 255, 0.603)"
                                        height="1.2rem"
                                        width="1.2rem"
                                        visible={didPaymentSuccess === 1}
                                    />
                                    <svg style={didPaymentSuccess === 2 ? {display:"block"}: {display:"none"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
                                        <path d="M337.5,664.5h0a2,2,0,0,0-2.82-.19l-11.35,9.88-5.37-6a2,2,0,0,0-2.84-.15l-.14.13a2,2,0,0,0-.15,2.81l6.73,7.53a2,2,0,0,0,2.83.15l1.61-1.46h0l11.32-9.86A2,2,0,0,0,337.5,664.5Z" transform="translate(-304.5 -648.5)"/>
                                        <path d="M325.5,648.5a21,21,0,1,0,21,21A21,21,0,0,0,325.5,648.5Zm0,38a17,17,0,1,1,17-17A17,17,0,0,1,325.5,686.5Z" transform="translate(-304.5 -648.5)"/>
                                    </svg>
                                    <svg style={didPaymentSuccess === 3 ? {display:"block"}: {display:"none"}} viewBox="0 0 42 42">
                                        <path d="M325.08,649.18a21,21,0,1,0,21,21A21,21,0,0,0,325.08,649.18Zm0,38a17,17,0,1,1,17-17A17,17,0,0,1,325.08,687.18Z" transform="translate(-304.08 -649.18)"/>
                                        <path d="M327.91,670.18l4.53-4.53a2,2,0,0,0-2.83-2.83l-4.53,4.53-4.52-4.53a2,2,0,1,0-2.83,2.83l4.53,4.53-4.53,4.53a2,2,0,1,0,2.83,2.83l4.52-4.53,4.53,4.53a2,2,0,0,0,2.83-2.83Z" transform="translate(-304.08 -649.18)"/>
                                    </svg>
                                    {languageLayout(<p>Creating a payment...</p>,<p>...جاري الدفع</p>)}
                                    
                                </div>

                                <div className={stylePurchase.loaders}>
                                    <svg style={didAccountCreated === 2 ? {display:"block"}: {display:"none"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
                                        <path d="M337.5,664.5h0a2,2,0,0,0-2.82-.19l-11.35,9.88-5.37-6a2,2,0,0,0-2.84-.15l-.14.13a2,2,0,0,0-.15,2.81l6.73,7.53a2,2,0,0,0,2.83.15l1.61-1.46h0l11.32-9.86A2,2,0,0,0,337.5,664.5Z" transform="translate(-304.5 -648.5)"/>
                                        <path d="M325.5,648.5a21,21,0,1,0,21,21A21,21,0,0,0,325.5,648.5Zm0,38a17,17,0,1,1,17-17A17,17,0,0,1,325.5,686.5Z" transform="translate(-304.5 -648.5)"/>
                                    </svg>
                                    <svg style={didAccountCreated === 3 ? {display:"block"}: {display:"none"}} viewBox="0 0 42 42">
                                        <path d="M325.08,649.18a21,21,0,1,0,21,21A21,21,0,0,0,325.08,649.18Zm0,38a17,17,0,1,1,17-17A17,17,0,0,1,325.08,687.18Z" transform="translate(-304.08 -649.18)"/>
                                        <path d="M327.91,670.18l4.53-4.53a2,2,0,0,0-2.83-2.83l-4.53,4.53-4.52-4.53a2,2,0,1,0-2.83,2.83l4.53,4.53-4.53,4.53a2,2,0,1,0,2.83,2.83l4.52-4.53,4.53,4.53a2,2,0,0,0,2.83-2.83Z" transform="translate(-304.08 -649.18)"/>
                                    </svg>
                                    <Loader
                                        type="BallTriangle"
                                        color="rgba(255, 255, 255, 0.603)"
                                        height="1.2rem"
                                        width="1.2rem"
                                        visible={didAccountCreated === 1}
                                    />
                                    
                                    {languageLayout(<p>Creating a acount...</p> ,<p>...يتم إنشاء الحساب</p>)}                                   
                                </div>
                                    
                                <div className={stylePurchase.secondInput} style={didPaymentSuccess === 2 && didAccountCreated === 3 ? {display:"block"}:{display:"none"}}>
                                    {languageLayout(<h4>Payment whent through, but failed to create an acount</h4> ,<p>عملية الدفع تمت بنجاح، ولكن فشلت عملية انشاء الحساب</p>)}
                                    {languageLayout(<h4>Please DON'T refresh the page</h4> ,<p>من فضلك لاتقم بإعادة تحميل الصفحة</p>)}
                                    {languageLayout(<h4>Type in a correct email and a valid password</h4> ,<p>من فضلك، قم بكتابة بريد الكتروني وكلمة مرور صالحين للاستخدام</p>)}
            
                                    <input className={stylePurchase.emailSecondInput} 
                                        style={{textAlign:textAlign}}
                                        onChange={e => handleChange(e)} 
                                        type="text" 
                                        name="email" 
                                        placeholder={languageLayout("Email" ,"البريد الألكتروني")} 
                                        value={email}/>

                                    <input 
                                        style={{textAlign:textAlign}}
                                        onChange={e => handleChange(e)} 
                                        type="password" name="password" 
                                        placeholder={languageLayout("Password" ,"كلمة المرور")} />
                                    <button disabled={isSecondformLoading}>
                                        {languageLayout("Create Account" ,"انشاء حساب")}
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.3 17">
                                            <polygon points="10.3 8.5 1.8 0 0 1.8 6.7 8.5 0 15.2 1.8 17 10.3 8.5"/>
                                        </svg>
                                    </button>
                                    <h6 className={stylePurchase.formError}>{error}</h6>
                                </div>
                                <div  className={stylePurchase.paymentFailed} style={didPaymentSuccess === 3 ? {display:"block"}:{display:"none"}}>
                                {languageLayout(<h4>Payment failed</h4> ,<h4>فشلت عملية الدفع</h4>)}
                                    
                                    <h6>{error}</h6>
                                    <button type="button" onClick={() => setIsLoading(false)}>{languageLayout("Try again" ,"حاول مرة أخرى!")}</button>
                                </div>
                            </div>
                        </form>
                        
                    </div>
                </div>
            ):(
                <div className={stylePurchase.success}>
                    <div className={stylePurchase.success__body}>
                            <h1>Success !</h1>
                            <h2>{userData.wisdom}</h2>
                            <h4>~ {userData.author} ~</h4>
                            <h3>Your code is: <br/> {userData.myCode}</h3>
                            <p>You have access to your wisdom and your code <br/>in the dashbord. <span><Link href="/signin">Login here!</Link></span></p>
                    </div>
                </div>
                )}
            </div>
        </motion.div>
    )
}
