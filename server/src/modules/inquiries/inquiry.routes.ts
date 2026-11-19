// HTTP layer for inquiries. Every route here is behind requireAuth (see router.use below).
//   GET    /api/inquiries              list (filters: status, q, assigned=me, page, pageSize)
//   POST   /api/inquiries              create                         -> 201
//   GET    /api/inquiries/:id          get one                        -> 404 if missing / not yours
//   PATCH  /api/inquiries/:id/status   change status   { status, version }
//   PATCH  /api/inquiries/:id/assignee change assignee { assignedToId, version }  (admin only)
import { Router } from "express";
import { validate } from "../../lib/validate";
import { currentUser, requireAuth } from "../../middleware/require-auth";
import {
  createInquirySchema,
  idParamSchema,
  listQuerySchema,
  updateAssigneeSchema,
  updateStatusSchema,
} from "./inquiry.schemas";
import * as service from "./inquiry.service";

export const inquiryRouter = Router();

inquiryRouter.use(requireAuth);

inquiryRouter.get("/", async (req, res) => {
  const query = validate(listQuerySchema, req.query);
  res.json(await service.listInquiries(currentUser(req), query));
});

inquiryRouter.post("/", async (req, res) => {
  const input = validate(createInquirySchema, req.body);
  const inquiry = await service.createInquiry(currentUser(req), input);
  res.status(201).location(`/api/inquiries/${inquiry.id}`).json(inquiry);
});

inquiryRouter.get("/:id", async (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  res.json(await service.getInquiry(currentUser(req), id));
});

inquiryRouter.patch("/:id/status", async (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateStatusSchema, req.body);
  res.json(await service.updateStatus(currentUser(req), id, input));
});

inquiryRouter.patch("/:id/assignee", async (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateAssigneeSchema, req.body);
  res.json(await service.updateAssignee(currentUser(req), id, input));
});
