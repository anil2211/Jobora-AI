import ExcelJS from "exceljs";
import express from "express";

import {
  addJobToSheet,
  createJobSheet,
} from "../googleSheets.js";

import { authenticate } from "../middleware/auth.js";
import { extractJob } from "../openai.js";
import { supabase } from "../supabase.js";

import {
  logger,
  sendToBetterStack,
} from "../utils/logger.js";


const router = express.Router();



// =====================================
// Extract Job using AI and Save
// =====================================

router.post(
  "/extract",
  authenticate,
  async (req, res) => {


    const {
      text,
      url,
      googleToken,
    } = req.body;



    if (!googleToken) {


      await sendToBetterStack(
        "warning",
        "GOOGLE_SHEET_TOKEN_MISSING",
        {
          userId:req.user.id,
        }
      );


      const error = new Error(
        "Google access token is required for Sheets sync"
      );


      error.status = 400;

      throw error;

    }



    try {



      const job =
        await extractJob(text);



      job.url = url;

      job.user_id =
        req.user.id;


      job.source =
        new URL(url).hostname;




      await sendToBetterStack(
        "info",
        "AI_JOB_EXTRACTED",
        {

          userId:req.user.id,

          title:job.title,

          company:job.company,

          source:job.source,

        }
      );



      // Save in Supabase

      const {
        data,
        error,

      } = await supabase


        .from("jobs")


        .insert(job)


        .select();



      if(error){


        await sendToBetterStack(
          "error",
          "JOB_DATABASE_SAVE_FAILED",
          {
            error:error.message,
            userId:req.user.id,
          }
        );


        throw error;

      }



      const savedJob =
        data[0];



      await sendToBetterStack(
        "info",
        "JOB_SAVED_SUCCESSFULLY",
        {

          jobId:savedJob.id,

          userId:req.user.id,

          company:savedJob.company,

          title:savedJob.title,

        }
      );





      // Google Sheet Sync

      try {



        const {
          data:userData,
          error:userError,

        } = await supabase


          .from("users")


          .select(
            "spreadsheet_id"
          )


          .eq(
            "id",
            req.user.id
          )


          .single();




        if(userError)
          throw userError;



        let spreadsheetId =
          userData?.spreadsheet_id;




        if(!spreadsheetId){



          spreadsheetId =
            await createJobSheet(
              googleToken
            );



          await supabase

            .from("users")

            .update({

              spreadsheet_id:
                spreadsheetId,

            })

            .eq(
              "id",
              req.user.id
            );



          await sendToBetterStack(
            "info",
            "GOOGLE_SHEET_CREATED",
            {

              spreadsheetId,

              userId:req.user.id,

            }
          );


        }




        await addJobToSheet(
          googleToken,
          spreadsheetId,
          savedJob
        );




        await sendToBetterStack(
          "info",
          "GOOGLE_SHEET_SYNC_SUCCESS",
          {

            spreadsheetId,

            jobId:savedJob.id,

            userId:req.user.id,

          }
        );



      }

      catch(sheetError){



        logger.error(
          {
            error:sheetError.message,
          },
          "Google Sheet Sync Failed"
        );



        await sendToBetterStack(
          "error",
          "GOOGLE_SHEET_SYNC_FAILED",
          {

            error:
              sheetError.message,

            jobId:
              savedJob.id,

          }
        );


      }




      res.json({

        success:true,

        job:savedJob,

      });



    }

    catch(error){



      await sendToBetterStack(
        "error",
        "JOB_EXTRACTION_FAILED",
        {

          error:error.message,

          userId:req.user.id,

        }
      );



      throw error;

    }


  }
);




// =====================================
// Save Job Directly
// =====================================


router.post(
  "/",
  async(req,res)=>{


    const {
      data,
      error,

    } = await supabase


      .from("jobs")


      .insert(req.body)


      .select();



    if(error){


      await sendToBetterStack(
        "error",
        "DIRECT_JOB_SAVE_FAILED",
        {
          error:error.message,
        }
      );


      throw error;

    }




    await sendToBetterStack(
      "info",
      "DIRECT_JOB_SAVED",
      {

        jobId:data[0].id,

      }
    );



    res.json(
      data[0]
    );


  }
);




// =====================================
// Get User Jobs
// =====================================


router.get(
  "/",
  authenticate,
  async(req,res)=>{


    const {
      data,
      error,

    } = await supabase


      .from("jobs")


      .select("*")


      .eq(
        "user_id",
        req.user.id
      )


      .order(
        "created_at",
        {
          ascending:false,
        }
      );



    if(error){


      await sendToBetterStack(
        "error",
        "FETCH_JOBS_FAILED",
        {
          error:error.message,
        }
      );


      throw error;

    }



    await sendToBetterStack(
      "info",
      "JOBS_FETCHED",
      {

        userId:req.user.id,

        count:data.length,

      }
    );



    res.json(data);



  }
);




// =====================================
// Export Jobs Excel
// =====================================


router.get(
"/export",
authenticate,
async(req,res)=>{


const {
 data,
 error,

}=await supabase


.from("jobs")


.select("*")


.eq(
"user_id",
req.user.id
)


.order(
"created_at",
{
ascending:false
}
);



if(error)
throw error;




const workbook =
new ExcelJS.Workbook();



const sheet =
workbook.addWorksheet(
"Job Tracker"
);



sheet.columns=[

{
header:"Title",
key:"title",
width:30
},

{
header:"Company",
key:"company",
width:25
},

{
header:"Location",
key:"location",
width:25
},

{
header:"Salary",
key:"salary",
width:15
},

{
header:"Experience",
key:"experience",
width:20
},

{
header:"Employment Type",
key:"employmentType",
width:20
},

{
header:"Skills",
key:"skills",
width:50
},

{
header:"Description",
key:"description",
width:60
},

{
header:"Source",
key:"source",
width:25
},

{
header:"Job URL",
key:"url",
width:50
},

{
header:"Saved Date",
key:"created_at",
width:25
},

];



data.forEach(job=>{


sheet.addRow({

title:job.title,

company:job.company,

location:job.location,

salary:job.salary,

experience:job.experience,

employmentType:
job.employmentType,

skills:
Array.isArray(job.skills)
?
job.skills.join(", ")
:
job.skills,

description:
job.description,

source:
job.source,

url:
job.url,

created_at:
job.created_at,

});


});



await sendToBetterStack(
"info",
"JOB_EXPORT_COMPLETED",
{

userId:req.user.id,

count:data.length,

}
);



res.setHeader(
"Content-Type",
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);



res.setHeader(
"Content-Disposition",
"attachment; filename=Job_Tracker.xlsx"
);



await workbook.xlsx.write(res);


res.end();



}
);



export default router;