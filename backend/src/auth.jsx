import {
    GoogleLogin,
    GoogleOAuthProvider
} from "@react-oauth/google";


export default function Auth(){

return (

<GoogleOAuthProvider

clientId=
"YOUR_CLIENT_ID"

>

<GoogleLogin

onSuccess={(credential)=>{

chrome.storage.local
.set({

googleToken:
credential.credential

});

}}

/>

</GoogleOAuthProvider>

)

}