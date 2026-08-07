import express from "express";
import { createJWT, verifyGoogleToken } from "../auth.js";
import { supabase } from "../supabase.js";
import {
  logger,
  sendToBetterStack,
} from "../utils/logger.js";


const router = express.Router();



router.post("/google", async (req, res) => {

  const { token } = req.body;


  if (!token) {

    const error = new Error(
      "Token is required"
    );

    error.status = 400;


    await sendToBetterStack(
      "warning",
      "GOOGLE_LOGIN_TOKEN_MISSING",
      {
        route: "/api/auth/google",
      }
    );


    throw error;
  }



  let googleUser;


  try {

    googleUser = await verifyGoogleToken(token);


  } catch (err) {


    logger.warn(
      {
        error: err.message,
      },
      "Google token verification failed"
    );


    await sendToBetterStack(
      "warning",
      "GOOGLE_LOGIN_FAILED",
      {
        error: err.message,
      }
    );


    err.status = 401;

    throw err;
  }



  if (!googleUser?.sub) {


    const error = new Error(
      "Invalid Google token"
    );


    error.status = 401;


    await sendToBetterStack(
      "warning",
      "INVALID_GOOGLE_USER",
      {
        email: googleUser?.email || null,
      }
    );


    throw error;
  }



  try {


    /*
      Find existing user
    */

    const {
      data: existing,
      error: selectError,

    } = await supabase

      .from("users")

      .select("*")

      .eq(
        "google_id",
        googleUser.sub
      )

      .limit(1);



    if (selectError) {


      await sendToBetterStack(
        "error",
        "USER_LOOKUP_FAILED",
        {
          error: selectError.message,
        }
      );


      throw selectError;
    }



    let user = existing?.[0] ?? null;



    /*
      Create new user
    */

    if (!user) {


      const {
        data: created,
        error: insertError,

      } = await supabase


        .from("users")


        .insert({

          google_id:
            googleUser.sub,

          email:
            googleUser.email ?? null,

          name:
            googleUser.name ?? null,

          avatar:
            googleUser.picture ?? null,

        })


        .select();



      if (insertError) {


        await sendToBetterStack(
          "error",
          "USER_CREATION_FAILED",
          {
            error: insertError.message,
            email: googleUser.email,
          }
        );


        throw insertError;
      }



      if (!created?.[0]) {


        throw new Error(
          "User creation failed"
        );

      }



      user = created[0];



      await sendToBetterStack(
        "info",
        "NEW_USER_REGISTERED",
        {

          userId: user.id,

          email: user.email,

          name: user.name,

        }
      );


    }


    /*
      Existing user update
    */

    else {


      const updates = {};



      if (googleUser.name) {

        updates.name =
          googleUser.name;

      }



      if (googleUser.picture) {

        updates.avatar =
          googleUser.picture;

      }



      if (
        Object.keys(updates).length > 0
      ) {


        const {
          data: updated,
          error: updateError,

        } = await supabase


          .from("users")


          .update(updates)


          .eq(
            "id",
            user.id
          )


          .select();



        if (updateError) {


          await sendToBetterStack(
            "error",
            "USER_UPDATE_FAILED",
            {
              error:updateError.message,
              userId:user.id,
            }
          );


          throw updateError;
        }



        if(updated?.[0]){

          user = updated[0];

        }


      }



      await sendToBetterStack(
        "info",
        "EXISTING_USER_LOGIN",
        {

          userId:user.id,

          email:user.email,

        }
      );


    }



    /*
      Create JWT
    */


    const jwtToken =
      createJWT(user);



    await sendToBetterStack(
      "info",
      "JWT_CREATED_SUCCESSFULLY",
      {

        userId:user.id,

        email:user.email,

      }
    );



    res.json({

      token: jwtToken,


      user: {

        id:user.id,

        email:user.email,

        name:user.name,

        avatar:user.avatar,

      },

    });



  } catch(error){



    logger.error(
      {
        error:error.message,
      },
      "Authentication processing failed"
    );



    await sendToBetterStack(
      "error",
      "AUTH_PROCESS_FAILED",
      {

        error:error.message,

        email:
          googleUser?.email || null,

      }
    );



    throw error;

  }


});



export default router;