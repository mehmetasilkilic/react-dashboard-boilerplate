import { useState, ReactNode, useCallback, useRef, useEffect } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

// Global Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import AutoForm, { AutoFormSubmit } from "@/components/ui/auto-form";
import { FieldConfig, Dependency } from "@/components/ui/auto-form/types";

interface StepContent {
  form?: {
    schema: z.ZodObject<any>;
    onSubmit?: (values: any) => void;
    fieldConfig?: FieldConfig<any>;
    dependencies?: Dependency<any>[];
  };
  content?: ReactNode;
}

interface Step {
  title: string;
  content: StepContent;
}

interface SteppedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  steps: Step[];
  onSave: (data: any) => void;
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
  }),
};

const contentVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      height: {
        type: "spring",
        stiffness: 500,
        damping: 30,
      },
      opacity: {
        duration: 0.2,
      },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: {
        type: "spring",
        stiffness: 500,
        damping: 30,
      },
      opacity: {
        duration: 0.2,
      },
    },
  },
};

export const SteppedModal: React.FC<SteppedModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  steps,
  onSave,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [formData, setFormData] = useState<any[]>([]);
  const [validSteps, setValidSteps] = useState<boolean[]>([]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, steps.length);
  }, [steps]);

  const resetModal = useCallback(() => {
    setCurrentStep(0);
    setDirection(0);
    setFormData(new Array(steps.length).fill({}));
    setValidSteps(new Array(steps.length).fill(false));
  }, [steps.length]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleXButtonClick = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  const validateStep = useCallback(
    (stepIndex: number, data: any) => {
      const step = steps[stepIndex];
      if (step.content.form && step.content.form.schema) {
        return step.content.form.schema.safeParse(data).success;
      }
      return true; // If there's no form schema, consider the step valid
    },
    [steps]
  );

  const handleStepComplete = useCallback(
    (data: any) => {
      setFormData((prev) => {
        const newFormData = [...prev];
        newFormData[currentStep] = data;
        return newFormData;
      });

      setValidSteps((prev) => {
        const newValidSteps = [...prev];
        newValidSteps[currentStep] = true;
        return newValidSteps;
      });

      if (currentStep < steps.length - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      } else {
        const allData = formData.reduce(
          (acc, curr) => ({ ...acc, ...curr }),
          {}
        );
        onSave(allData);
      }
    },
    [currentStep, steps.length, formData, onSave]
  );

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    (index: number) => {
      // Allow navigation to this step if all previous steps are valid
      if (index === 0 || validSteps.slice(0, index).every(Boolean)) {
        setDirection(index > currentStep ? 1 : -1);
        setCurrentStep(index);
      }
    },
    [validSteps, currentStep]
  );

  const renderStepContent = (step: Step, stepIndex: number) => {
    const content = step.content.form ? (
      <AutoForm
        formSchema={step.content.form.schema}
        onSubmit={handleStepComplete}
        fieldConfig={step.content.form.fieldConfig}
        dependencies={step.content.form.dependencies}
        values={formData[stepIndex]}
        onValuesChange={(values) => {
          setFormData((prev) => {
            const newFormData = [...prev];
            newFormData[stepIndex] = values;
            return newFormData;
          });
          setValidSteps((prev) => {
            const newValidSteps = [...prev];
            newValidSteps[stepIndex] = validateStep(stepIndex, values);
            return newValidSteps;
          });
        }}
      >
        <div className="flex justify-end mt-6">
          {stepIndex > 0 && (
            <Button
              type="button"
              onClick={handlePrevious}
              variant="outline"
              className="mr-auto"
            >
              <Icon name="ArrowLeftIcon" className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          <AutoFormSubmit>
            {stepIndex === steps.length - 1 ? (
              <>
                Save
                <Icon name="CheckCircledIcon" className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <Icon name="ArrowRightIcon" className="w-4 h-4 ml-2" />
              </>
            )}
          </AutoFormSubmit>
        </div>
      </AutoForm>
    ) : step.content.content ? (
      <>
        {step.content.content}
        <div className="flex justify-between mt-6">
          <Button
            onClick={handlePrevious}
            disabled={stepIndex === 0}
            variant="outline"
          >
            <Icon name="ArrowLeftIcon" className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button onClick={() => handleStepComplete(formData[stepIndex])}>
            {stepIndex === steps.length - 1 ? (
              <>
                Save
                <Icon name="CheckCircledIcon" className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <Icon name="ArrowRightIcon" className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </>
    ) : null;

    return (
      <motion.div
        ref={(el) => (stepRefs.current[stepIndex] = el)}
        key={stepIndex}
        custom={direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        {content}
      </motion.div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <Button
          variant="ghost"
          onClick={handleXButtonClick}
          className="absolute right-4 top-4"
          aria-label="Close dialog"
        >
          <Icon name="Cross1Icon" className="h-4 w-4" />
        </Button>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-gray-500">
            {description}
          </DialogDescription>
        </DialogHeader>
        {steps.length > 1 && (
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className={`flex-1 ${index !== steps.length - 1 ? "pr-8 sm:pr-20" : ""}`}
                >
                  <Button
                    onClick={() => handleStepClick(index)}
                    disabled={
                      index > 0 && !validSteps.slice(0, index).every(Boolean)
                    }
                    variant="ghost"
                    className={`flex items-center justify-start w-full space-x-2 ${
                      index === currentStep
                        ? "bg-blue-50 text-blue-700"
                        : validSteps[index]
                          ? "text-green-700"
                          : "text-gray-500"
                    }`}
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-300">
                      {validSteps[index] ? (
                        <Icon
                          name="CheckIcon"
                          className="w-5 h-5 text-green-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </span>
                    <span className="ml-4 text-sm font-medium">
                      {step.title}
                    </span>
                  </Button>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-50 rounded-lg overflow-hidden"
          >
            <div className="p-6">
              {renderStepContent(steps[currentStep], currentStep)}
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
