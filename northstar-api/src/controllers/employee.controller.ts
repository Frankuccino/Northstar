// employee controller layer

import { Request, Response } from "express";
import * as employeeService from "../services/employee.service.js";

export const getEmployees = async (_req: Request, res: Response) => {
  try {
    const employees = await employeeService.getAll();
    res.json(employees);
  } catch (err) {
    res.status(500).json({
      message: "Faled to fetch employees",
    });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: "Failed to create employee" });
  }
};
