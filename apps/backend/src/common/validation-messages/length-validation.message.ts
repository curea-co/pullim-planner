import { ValidationArguments } from "class-validator";
import {
  exactLengthMessage,
  maxLengthMessage,
  minLengthMessage,
} from "./templates";

export const minLengthValidationMessage = (args: ValidationArguments) =>
  minLengthMessage(args.property, args.constraints[0] as number);

export const maxLengthValidationMessage = (args: ValidationArguments) =>
  maxLengthMessage(args.property, args.constraints[0] as number);

export const exactLengthValidationMessage = (args: ValidationArguments) =>
  exactLengthMessage(args.property, args.constraints[0] as number);
