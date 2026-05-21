import { motion } from 'motion/react';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
export const MotionFlex = motion.create(Flex, { forwardMotionProps: true });
export const MotionGroup = motion.create(Group, { forwardMotionProps: true });
export const MotionStack = motion.create(Stack, { forwardMotionProps: true });
export const MotionDiv = motion.div;
