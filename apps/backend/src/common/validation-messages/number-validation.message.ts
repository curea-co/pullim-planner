import { ValidationArguments } from "class-validator";
import { maxMessage, minMessage, numberMessage } from "./templates";

export const numberValidationMessage = (args: ValidationArguments) =>
  numberMessage(args.property);

export const minValidationMessage = (args: ValidationArguments) =>
  minMessage(args.property, args.constraints[0] as number);

export const maxValidationMessage = (args: ValidationArguments) =>
  maxMessage(args.property, args.constraints[0] as number);
