import { Prisma, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import {updateBlogInput,createBlogInput} from "@kushagra_95/medium-common"
export const blogRouter=new Hono<{
    Bindings:{
        DATABASE_URL:string;
        JWT_SECRET:string;
    },
    Variables:{
      userId:string
    }
}>();
blogRouter.use("/*",async (c,next)=>{
  const authHeader = c.req.header("authorization")||"";
  
  try {
    const user =await verify(authHeader,c.env.JWT_SECRET)
    if(user && typeof user.id === 'string'){
      c.set("userId",user.id);
      await next();
    }else{
      c.status(403)
      return c.json({
        message :"You are logged in"
      })
    }
  } catch (error) {
    c.status(403);
        return c.json({
            message: "Invalid token",
        });
  }
 
})
blogRouter.post('/',async(c)=>{
  const body=await c.req.json();
  const {success}=createBlogInput.safeParse(body);
    if(!success){
        c.status(411);
        return c.json({
            message:"Input not correct"
        })
    }
  const authorId=c.get("userId");
  const prisma =new PrismaClient({
    datasourceUrl:c.env.DATABASE_URL,
  }).$extends(withAccelerate())
  const blog= await prisma.post.create({
    data:{
      title:body.title,
      content:body.content,
      authorId:authorId
    }
  })
    return c.json({
      id:blog.id,
    })
  })
  blogRouter.get('/bulk',async (c)=>{
    const prisma = new PrismaClient({
      datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    const blogs=await prisma.post.findMany({
      select:{
        content:true,
        title:true,
        id:true,
        author:{
          select:{
            name:true
          }
        }
      }
    });

    return c.json({
      blogs
    })
  })
blogRouter.get('/:id',async(c)=>{
    const id=await c.req.param("id");
    const prisma =new PrismaClient({
      datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate())
  
    try {
      const blog=await prisma.post.findFirst({
        where:{
          id:id
        },select:{
          title:true,
          content:true,
          author:{
            select:{
              name:true
            }
          }
        }
      })
      return c.json({
      blog
      })
    } catch (error) {
      c.status(411);
      return c.json({message:"Error while fetching blog post"})
    }
  })
blogRouter.put('/',async (c)=>{
    const body=await c.req.json();
    const {success}=updateBlogInput.safeParse(body);
    if(!success){
        c.status(411);
        return c.json({
            message:"Input not correct"
        })
    }
    const prisma=new PrismaClient({
      datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog =await prisma.post.update({
      where:{
        id:body.id
      },
      data:{
        title:body.title,
        content:body.content,
      }
    })
    return c.json({
      id:blog.id,
    })
  })
  //Todo :add pagination